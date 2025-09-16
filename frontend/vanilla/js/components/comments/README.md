# Comments System Documentation

## Overview
The comments system provides a complete solution for threaded discussions, real-time updates, and user interactions within the Project Management application. Built with vanilla JavaScript, it integrates seamlessly with the existing WebSocket system and backend API.

## Architecture

### Core Components

1. **CommentService** (`js/services/comment.js`)
   - Handles API interactions for CRUD operations
   - Manages real-time updates via WebSocket
   - Provides caching and state management

2. **CommentList** (`js/components/comments/CommentList.js`)
   - Displays flat or threaded comment lists
   - Supports pagination and infinite scroll
   - Includes loading states and error handling

3. **CommentForm** (`js/components/comments/CommentForm.js`)
   - Form for creating and editing comments
   - Supports mentions (@username) with autocomplete
   - Basic rich text formatting toolbar

4. **CommentItem** (`js/components/comments/CommentItem.js`)
   - Individual comment display with actions
   - Nested reply structure
   - User permissions and interactions

5. **CommentThread** (`js/components/comments/CommentThread.js`)
   - Complete threaded discussion interface
   - Manages entire comment lifecycle
   - Integration-ready component

6. **CommentsIntegration** (`js/components/comments/CommentsIntegration.js`)
   - Utility for integrating comments with existing components
   - Flexible placement options (sidebar, modal, inline)
   - Comment count indicators and indicators

## Usage Examples

### Basic Usage

#### 1. Initialize Comment Service
```javascript
// Service is automatically initialized via serviceInit.js
// Available as: window.commentService
```

#### 2. Display Comments for an Item
```javascript
// Method 1: Using CommentThread component
const commentThread = new CommentThread('comments-container', {
    itemId: 'item123',
    commentService: window.commentService,
    currentUser: currentUser,
    maxDepth: 3
});

// Method 2: Using CommentsIntegration utility
window.commentsIntegration.showCommentsForItem('item123', itemData, {
    placement: 'sidebar',
    enableReplies: true,
    enableEditing: true
});
```

#### 3. Display Comment Counts
```javascript
// Add comment indicators to items
await window.commentsIntegration.updateCommentIndicators(items);

// Get comment count for specific item
const count = await window.commentsIntegration.getCommentCount('item123');
```

### Advanced Usage

#### Custom Comment List
```javascript
const commentList = new CommentList('comment-list-container', {
    itemId: 'item123',
    commentService: window.commentService,
    currentUser: currentUser,
    showThreaded: true,
    onReplyClick: (commentId) => {
        // Handle reply action
    },
    onEditClick: (commentId) => {
        // Handle edit action
    }
});
```

#### Custom Comment Form
```javascript
const commentForm = new CommentForm('comment-form-container', {
    itemId: 'item123',
    commentService: window.commentService,
    currentUser: currentUser,
    onSuccess: (comment) => {
        console.log('Comment submitted:', comment);
    },
    onError: (error) => {
        console.error('Error submitting comment:', error);
    }
});
```

## API Reference

### CommentService Methods

#### `getItemComments(itemId)`
- **Returns:** Promise<Array> - Array of comments for the item
- **Usage:** Get flat list of comments

#### `getThreadedComments(itemId)`
- **Returns:** Promise<Array> - Array of threaded comments
- **Usage:** Get nested comment structure

#### `createComment(itemId, commentData)`
- **Parameters:**
  - `itemId`: string - Item ID
  - `commentData`: object - { content, mentions, parentId }
- **Returns:** Promise<Object> - Created comment

#### `updateComment(commentId, updateData)`
- **Parameters:**
  - `commentId`: string - Comment ID
  - `updateData`: object - { content, mentions }
- **Returns:** Promise<Object> - Updated comment

#### `deleteComment(commentId)`
- **Parameters:**
  - `commentId`: string - Comment ID
- **Returns:** Promise<boolean> - Success status

#### `getUserComments(userId)`
- **Returns:** Promise<Array> - Array of user's comments

### Event System

The comment system emits and listens to the following events:

#### Emitted Events
- `comment:created` - New comment created
- `comment:updated` - Comment updated
- `comment:deleted` - Comment deleted
- `comment:reply_created` - New reply created

#### Listened Events
- `item:selected` - Load comments for selected item
- `item:deselected` - Hide comments
- `modal:closed` - Hide comments
- `board:selected` - Clear current comments

## Styling and Customization

### CSS Variables
```css
:root {
    --bg-primary: #ffffff;
    --bg-secondary: #f8f9fa;
    --text-primary: #212529;
    --text-secondary: #6c757d;
    --border-color: #dee2e6;
    --color-primary: #007bff;
    --color-danger: #dc3545;
}
```

### Responsive Design
- **Desktop:** Full-featured sidebar and modal views
- **Tablet:** Optimized layouts with touch-friendly interactions
- **Mobile:** Stack-based layout with swipe gestures

## Integration Guide

### Step 1: Add Scripts
Include all comment system scripts in your HTML:

```html
<!-- Services -->
<script src="js/services/websocket.js"></script>
<script src="js/services/comment.js"></script>
<script src="js/services/serviceInit.js"></script>

<!-- Components -->
<script src="js/components/comments/CommentItem.js"></script>
<script src="js/components/comments/CommentForm.js"></script>
<script src="js/components/comments/CommentList.js"></script>
<script src="js/components/comments/CommentThread.js"></script>
<script src="js/components/comments/CommentsIntegration.js"></script>
```

### Step 2: Initialize Integration
```javascript
// Initialize comments integration
const commentsIntegration = new CommentsIntegration({
    container: document.body,
    currentUser: {
        id: 'user123',
        name: 'John Doe',
        email: 'john@example.com'
    }
});

await commentsIntegration.initialize();
```

### Step 3: Integrate with BoardView
```javascript
// In BoardViewEnhanced.js or similar
class BoardViewEnhanced {
    async openItemDetail(item) {
        // Existing item detail logic
        
        // Add comments
        await window.commentsIntegration.showCommentsForItem(item.id, item, {
            placement: 'sidebar',
            enableReplies: true,
            enableEditing: true
        });
    }
}
```

### Step 4: Add Comment Indicators
```javascript
// After loading items
await window.commentsIntegration.updateCommentIndicators(allItems);
```

## Features

### Core Features
- ✅ **Threaded Comments** - Unlimited nesting depth
- ✅ **Real-time Updates** - WebSocket integration
- ✅ **User Permissions** - Role-based editing/deleting
- ✅ **Mentions** - @username with autocomplete
- ✅ **Rich Text** - Basic formatting support
- ✅ **Responsive Design** - Mobile-friendly
- ✅ **Loading States** - Skeleton UI
- ✅ **Error Handling** - Graceful error recovery

### Advanced Features
- ✅ **Comment Counts** - Display on items
- ✅ **Flexible Placement** - Sidebar, modal, inline
- ✅ **Edit/Delete** - With confirmation dialogs
- ✅ **Like System** - Simple like functionality
- ✅ **Attach Files** - Support for attachments
- ✅ **User Badges** - Role indicators
- ✅ **Search/Filter** - Find comments by user

## WebSocket Integration

The comment system is fully integrated with the WebSocket service for real-time updates:

### Subscription Topics
- `item:{itemId}` - Item-specific comments
- `comment:{commentId}` - Individual comment updates

### Real-time Events
- **comment:created** - New comment added
- **comment:updated** - Comment edited
- **comment:deleted** - Comment removed
- **comment:reply_created** - New reply added

## Security

- **Authentication** - Uses existing JWT tokens
- **Authorization** - Role-based permissions
- **Input Sanitization** - XSS protection
- **Rate Limiting** - Optional API-level protection

## Performance

- **Lazy Loading** - Comments load on demand
- **Caching** - In-memory comment storage
- **Debounced Updates** - Prevents excessive re-renders
- **Skeleton UI** - Improves perceived performance

## Troubleshooting

### Common Issues

#### "Comment service not found"
- Ensure service initialization is complete
- Check that all scripts are loaded

#### "Comments not displaying"
- Verify itemId is provided
- Check network connectivity
- Ensure user has appropriate permissions

#### "Real-time updates not working"
- Verify WebSocket connection
- Check subscription to item topics
- Ensure event listeners are properly set up

### Debug Mode
Enable debug logging:
```javascript
window.commentService.debug = true;
```

## Browser Support
- Chrome 70+
- Firefox 65+
- Safari 12+
- Edge 79+
- Mobile browsers (iOS Safari, Chrome Mobile)

## License
MIT License - See LICENSE file for details