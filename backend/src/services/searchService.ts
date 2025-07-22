import { query, transaction } from '../db/client.js';
import { validateBoardAccess } from './boardService.js';
import { generateId } from '../utils/id.js';

/**
 * Search result with relevance score
 */
export interface SearchResult {
  id: string;
  title: string;
  description: string | null;
  boardId: string;
  columnId: string;
  relevance: number;
  matchedField: string;
  highlight?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Search history entry
 */
export interface SearchHistoryEntry {
  id: string;
  userId: string;
  searchTerm: string;
  boardId: string | null;
  resultCount: number;
  createdAt: Date;
}

/**
 * Search suggestion with metadata
 */
export interface SearchSuggestion {
  term: string;
  frequency: number;
  lastUsed: Date;
  source: 'history' | 'popular' | 'generated';
}

/**
 * Search options for advanced search
 */
export interface SearchOptions {
  limit?: number;
  offset?: number;
  saveHistory?: boolean;
  includeFieldValues?: boolean;
  searchInColumns?: string[];
  minRelevance?: number;
  highlightResults?: boolean;
  sortBy?: 'relevance' | 'created' | 'updated';
  sortDirection?: 'asc' | 'desc';
}

/**
 * Search items across a board
 */
export async function searchBoardItems(
  boardId: string,
  searchTerm: string,
  userId: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  // Validate board access
  await validateBoardAccess(boardId, userId);
  
  const {
    limit = 100,
    offset = 0,
    includeFieldValues = false,
    minRelevance = 0.01,
    highlightResults = false,
    sortBy = 'relevance',
    sortDirection = 'desc'
  } = options;
  
  // Use the materialized view for faster searching if available
  let searchQuery = '';
  let orderByClause = '';
  
  // Determine if we should use the materialized view or direct search
  const mvExists = await checkMaterializedViewExists();
  
  if (mvExists) {
    // Use the materialized view for optimized search
    searchQuery = `
      SELECT 
        i.id, i.title, i.description, i.board_id, i.column_id, i.created_at, i.updated_at,
        ts_rank(i.search_document, to_tsquery('english', $2)) as relevance,
        CASE 
          WHEN i.title ILIKE '%' || $2 || '%' THEN 'title'
          ELSE 'description'
        END as matched_field
        ${highlightResults ? `, ts_headline('english', COALESCE(i.title, '') || ' ' || COALESCE(i.description, ''), to_tsquery('english', $2), 'StartSel=<mark>, StopSel=</mark>, MaxWords=50, MinWords=20') as highlight` : ''}
      FROM search_items_mv i
      WHERE i.board_id = $1 
        AND i.search_document @@ to_tsquery('english', $2)
        AND ts_rank(i.search_document, to_tsquery('english', $2)) >= $4
    `;
  } else {
    // Fall back to direct search if materialized view doesn't exist
    searchQuery = `
      SELECT 
        i.id, i.title, i.description, i.board_id, i.column_id, i.created_at, i.updated_at,
        ts_rank(
          setweight(to_tsvector('english', i.title), 'A') || 
          setweight(to_tsvector('english', COALESCE(i.description, '')), 'B'),
          to_tsquery('english', $2)
        ) as relevance,
        CASE 
          WHEN i.title ILIKE '%' || $2 || '%' THEN 'title'
          ELSE 'description'
        END as matched_field
        ${highlightResults ? `, ts_headline('english', COALESCE(i.title, '') || ' ' || COALESCE(i.description, ''), to_tsquery('english', $2), 'StartSel=<mark>, StopSel=</mark>, MaxWords=50, MinWords=20') as highlight` : ''}
      FROM board_items i
      WHERE i.board_id = $1 
        AND (
          to_tsvector('english', i.title) || 
          to_tsvector('english', COALESCE(i.description, ''))
        ) @@ to_tsquery('english', $2)
        AND ts_rank(
          setweight(to_tsvector('english', i.title), 'A') || 
          setweight(to_tsvector('english', COALESCE(i.description, '')), 'B'),
          to_tsquery('english', $2)
        ) >= $4
    `;
  }
  
  // Prepare the search term for tsquery
  const processedSearchTerm = prepareSearchTerm(searchTerm);
  
  // Determine the order by clause based on options
  switch (sortBy) {
    case 'created':
      orderByClause = `i.created_at ${sortDirection === 'desc' ? 'DESC' : 'ASC'}`;
      break;
    case 'updated':
      orderByClause = `i.updated_at ${sortDirection === 'desc' ? 'DESC' : 'ASC'}`;
      break;
    case 'relevance':
    default:
      orderByClause = `relevance ${sortDirection === 'desc' ? 'DESC' : 'ASC'}`;
      break;
  }
  
  // Complete the query with ordering and limits
  const finalQuery = `
    ${searchQuery}
    ORDER BY ${orderByClause}
    LIMIT $3 OFFSET $5
  `;
  
  // Execute the search query
  const result = await query(
    finalQuery,
    [boardId, processedSearchTerm, limit, minRelevance, offset]
  );
  
  // Save search history if requested
  if (options.saveHistory) {
    await saveSearchHistory(userId, searchTerm, boardId, result.rows.length);
  }
  
  // Map the results to the SearchResult interface
  const searchResults = result.rows.map(row => ({
    id: row.id,
    title: row.title,
    description: row.description,
    boardId: row.board_id,
    columnId: row.column_id,
    relevance: row.relevance,
    matchedField: row.matched_field,
    highlight: row.highlight,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
  
  // If includeFieldValues is true, fetch field values for the items
  if (includeFieldValues && searchResults.length > 0) {
    await enrichSearchResultsWithFieldValues(searchResults);
  }
  
  return searchResults;
}

/**
 * Check if the search materialized view exists
 */
async function checkMaterializedViewExists(): Promise<boolean> {
  try {
    const result = await query(
      `SELECT 1 FROM pg_matviews WHERE matviewname = 'search_items_mv'`,
      []
    );
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error checking materialized view:', error);
    return false;
  }
}

/**
 * Prepare search term for tsquery
 * Converts a raw search term into a format suitable for PostgreSQL tsquery
 */
function prepareSearchTerm(searchTerm: string): string {
  // Remove special characters and replace with spaces
  let processed = searchTerm.replace(/[^\w\s]/g, ' ');
  
  // Split into words
  const words = processed.trim().split(/\s+/);
  
  // If there are multiple words, combine with & (AND) operator
  if (words.length > 1) {
    // Add :* to each word for prefix matching
    return words.map(word => `${word}:*`).join(' & ');
  }
  
  // For single word, just add :* for prefix matching
  return `${words[0]}:*`;
}

/**
 * 
Enrich search results with field values
 */
async function enrichSearchResultsWithFieldValues(results: SearchResult[]): Promise<void> {
  if (results.length === 0) return;
  
  // Get all item IDs
  const itemIds = results.map(result => result.id);
  
  // Query for field values (this would be expanded in a real implementation)
  // For now, we'll just simulate the concept
  try {
    const fieldValuesResult = await query(
      `SELECT item_id, column_id, value 
       FROM item_field_values 
       WHERE item_id = ANY($1)`,
      [itemIds]
    );
    
    // Create a map of item ID to field values
    const fieldValuesMap = new Map<string, Record<string, any>>();
    
    for (const row of fieldValuesResult.rows) {
      if (!fieldValuesMap.has(row.item_id)) {
        fieldValuesMap.set(row.item_id, {});
      }
      
      fieldValuesMap.get(row.item_id)![row.column_id] = row.value;
    }
    
    // Add field values to search results
    for (const result of results) {
      (result as any).fieldValues = fieldValuesMap.get(result.id) || {};
    }
  } catch (error) {
    console.error('Error enriching search results with field values:', error);
  }
}

/**
 * Save search history entry
 */
async function saveSearchHistory(
  userId: string,
  searchTerm: string,
  boardId: string | null,
  resultCount: number
): Promise<void> {
  try {
    await query(
      `INSERT INTO search_history (
         id, user_id, search_term, board_id, result_count, created_at
       ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        generateId(),
        userId,
        searchTerm,
        boardId,
        resultCount,
        new Date()
      ]
    );
  } catch (error) {
    // Log error but don't fail the search operation
    console.error('Failed to save search history:', error);
  }
}

/**
 * Get search history for a user
 */
export async function getSearchHistory(
  userId: string,
  options: {
    limit?: number;
    boardId?: string | null;
    offset?: number;
  } = {}
): Promise<SearchHistoryEntry[]> {
  const { limit = 10, boardId = null, offset = 0 } = options;
  
  let whereClause = 'WHERE user_id = $1';
  const params = [userId];
  let paramIndex = 2;
  
  if (boardId !== null) {
    whereClause += ` AND board_id = $${paramIndex++}`;
    params.push(boardId);
  }
  
  const result = await query(
    `SELECT * FROM search_history
     ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    [...params, limit, offset]
  );
  
  return result.rows.map(row => ({
    id: row.id,
    userId: row.user_id,
    searchTerm: row.search_term,
    boardId: row.board_id,
    resultCount: row.result_count,
    createdAt: row.created_at
  }));
}

/**
 * Get search suggestions based on history, popular searches, and generated suggestions
 */
export async function getSearchSuggestions(
  userId: string,
  prefix: string,
  options: {
    boardId?: string | null;
    limit?: number;
    includeGenerated?: boolean;
  } = {}
): Promise<SearchSuggestion[]> {
  const { boardId = null, limit = 5, includeGenerated = true } = options;
  const suggestions: SearchSuggestion[] = [];
  
  // 1. Get suggestions from user's own history
  const userHistoryQuery = boardId
    ? `SELECT search_term, MAX(created_at) as last_used, COUNT(*) as frequency
       FROM search_history
       WHERE user_id = $1 AND board_id = $2 AND search_term ILIKE $3 || '%'
       GROUP BY search_term
       ORDER BY last_used DESC
       LIMIT $4`
    : `SELECT search_term, MAX(created_at) as last_used, COUNT(*) as frequency
       FROM search_history
       WHERE user_id = $1 AND search_term ILIKE $2 || '%'
       GROUP BY search_term
       ORDER BY last_used DESC
       LIMIT $3`;
  
  const userHistoryParams = boardId
    ? [userId, boardId, prefix, limit]
    : [userId, prefix, limit];
  
  const userHistoryResult = await query(userHistoryQuery, userHistoryParams);
  
  // Add user history suggestions
  for (const row of userHistoryResult.rows) {
    suggestions.push({
      term: row.search_term,
      frequency: parseInt(row.frequency),
      lastUsed: row.last_used,
      source: 'history'
    });
  }
  
  // If we have enough suggestions from history, return them
  if (suggestions.length >= limit) {
    return suggestions.slice(0, limit);
  }
  
  // 2. Supplement with popular searches from the suggestions table
  const remainingLimit = limit - suggestions.length;
  const existingTerms = suggestions.map(s => s.term);
  
  let placeholders = '';
  if (existingTerms.length > 0) {
    placeholders = `AND term NOT IN (${existingTerms.map((_, i) => `$${i + 3}`).join(', ')})`;
  }
  
  const popularQuery = `
    SELECT term, frequency, last_used
    FROM search_suggestions
    WHERE term ILIKE $1 || '%' ${placeholders}
    ORDER BY frequency DESC, last_used DESC
    LIMIT $2
  `;
  
  const popularParams = [prefix, remainingLimit, ...existingTerms];
  
  const popularResult = await query(popularQuery, popularParams);
  
  // Add popular suggestions
  for (const row of popularResult.rows) {
    suggestions.push({
      term: row.term,
      frequency: row.frequency,
      lastUsed: row.last_used,
      source: 'popular'
    });
  }
  
  // 3. If we still need more and includeGenerated is true, generate suggestions
  if (includeGenerated && suggestions.length < limit && prefix.length >= 3) {
    const generatedSuggestions = await generateSearchSuggestions(prefix, limit - suggestions.length);
    suggestions.push(...generatedSuggestions);
  }
  
  return suggestions.slice(0, limit);
}

/**
 * Generate search suggestions based on keyword extraction
 */
async function generateSearchSuggestions(
  prefix: string,
  limit: number
): Promise<SearchSuggestion[]> {
  try {
    // Use the extract_search_keywords function to generate suggestions
    const result = await query(
      `SELECT * FROM extract_search_keywords($1) 
       WHERE keyword ILIKE $2 || '%'
       LIMIT $3`,
      [prefix, prefix, limit]
    );
    
    return result.rows.map(row => ({
      term: row.keyword,
      frequency: 0,
      lastUsed: new Date(),
      source: 'generated'
    }));
  } catch (error) {
    console.error('Error generating search suggestions:', error);
    return [];
  }
}

/**
 * Clear search history for a user
 */
export async function clearSearchHistory(userId: string): Promise<void> {
  await query(
    'DELETE FROM search_history WHERE user_id = $1',
    [userId]
  );
}

/**
 * Refresh the search index
 */
export async function refreshSearchIndex(): Promise<void> {
  try {
    await query('REFRESH MATERIALIZED VIEW CONCURRENTLY search_items_mv', []);
  } catch (error) {
    console.error('Error refreshing search index:', error);
    // If the materialized view doesn't exist yet, create it
    try {
      await query(`
        CREATE MATERIALIZED VIEW IF NOT EXISTS search_items_mv AS
        SELECT 
          i.id,
          i.title,
          i.description,
          i.board_id,
          i.column_id,
          i.created_at,
          i.updated_at,
          setweight(to_tsvector('english', i.title), 'A') || 
          setweight(to_tsvector('english', COALESCE(i.description, '')), 'B') as search_document
        FROM board_items i
      `, []);
      
      await query(`
        CREATE INDEX IF NOT EXISTS idx_search_items_mv_document ON search_items_mv USING GIN (search_document)
      `, []);
      
      await query(`
        CREATE INDEX IF NOT EXISTS idx_search_items_mv_board_id ON search_items_mv (board_id)
      `, []);
    } catch (innerError) {
      console.error('Error creating search materialized view:', innerError);
    }
  }
}

/**
 * Get trending search terms
 */
export async function getTrendingSearchTerms(
  limit: number = 10,
  boardId: string | null = null
): Promise<{ term: string; count: number }[]> {
  const whereClause = boardId ? 'WHERE board_id = $2' : '';
  const params = boardId ? [limit, boardId] : [limit];
  
  const result = await query(
    `SELECT search_term as term, COUNT(*) as count
     FROM search_history
     ${whereClause}
     GROUP BY search_term
     ORDER BY count DESC
     LIMIT $1`,
    params
  );
  
  return result.rows.map(row => ({
    term: row.term,
    count: parseInt(row.count)
  }));
}

/**
 * Get related search terms
 */
export async function getRelatedSearchTerms(
  searchTerm: string,
  limit: number = 5
): Promise<string[]> {
  // Find search sessions where this term was used
  const result = await query(
    `WITH user_sessions AS (
       SELECT DISTINCT user_id, DATE_TRUNC('hour', created_at) as session_hour
       FROM search_history
       WHERE search_term = $1
     )
     SELECT sh.search_term, COUNT(*) as frequency
     FROM search_history sh
     JOIN user_sessions us ON sh.user_id = us.user_id 
       AND DATE_TRUNC('hour', sh.created_at) = us.session_hour
     WHERE sh.search_term != $1
     GROUP BY sh.search_term
     ORDER BY frequency DESC
     LIMIT $2`,
    [searchTerm, limit]
  );
  
  return result.rows.map(row => row.search_term);
}