import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/use-auth';
import { AtSign, Send } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { boardService } from '@/services/board-service';
import { useSocket } from '@/hooks/use-socket';
import { ConflictResolution } from '@/components/collaboration';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

interface CommentComposerProps {
  initialContent?: string;
  placeholder?: string;
  buttonText?: string;
  onSubmit: (content: string, mentions: string[]) => void;
  onCancel?: () => void;
}

export function CommentComposer({
  initialContent = '',
  placeholder = 'Write a comment...',
  buttonText = 'Submit',
  onSubmit,
  onCancel,
}: CommentComposerProps) {
  const [content, setContent] = useState(initialContent);
  const [isMentionOpen, setIsMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [mentions, setMentions] = useState<string[]>([]);
  const [hasConflict, setHasConflict] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { user } = useAuth();
  const { sendTypingIndicator } = useSocket();
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Reset content when initialContent changes
  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);
  
  // Clean up typing indicator on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Turn off typing indicator if component unmounts while typing
      if (textareaRef.current?.closest('[data-item-id]')) {
        const itemId = textareaRef.current.closest('[data-item-id]')?.getAttribute('data-item-id');
        const boardId = textareaRef.current.closest('[data-board-id]')?.getAttribute('data-board-id');
        
        if (boardId && itemId) {
          sendTypingIndicator(boardId, itemId, false);
        }
      }
    };
  }, [sendTypingIndicator]);

  // Fetch workspace members for mentions
  const { data: workspaceMembers } = useQuery({
    queryKey: ['workspaceMembers'],
    queryFn: async () => {
      // This is a simplified approach - in a real app, you'd fetch members from the current workspace
      return [
        { id: '1', firstName: 'John', lastName: 'Doe', avatarUrl: '' },
        { id: '2', firstName: 'Jane', lastName: 'Smith', avatarUrl: '' },
        { id: '3', firstName: 'Alex', lastName: 'Johnson', avatarUrl: '' },
      ];
    },
  });

  // Handle textarea input
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    
    // Check for @ character to trigger mention
    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = newContent.substring(0, cursorPosition);
    const lastAtSymbol = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtSymbol !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtSymbol + 1);
      const hasSpaceAfterAt = /\s/.test(textAfterAt);
      
      if (!hasSpaceAfterAt) {
        setMentionStartIndex(lastAtSymbol);
        setMentionQuery(textAfterAt);
        setIsMentionOpen(true);
        return;
      }
    }
    
    setIsMentionOpen(false);
    
    // Send typing indicator
    if (textareaRef.current?.closest('[data-item-id]')) {
      const itemId = textareaRef.current.closest('[data-item-id]')?.getAttribute('data-item-id');
      const boardId = textareaRef.current.closest('[data-board-id]')?.getAttribute('data-board-id');
      
      if (boardId && itemId) {
        // Clear existing timeout
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        
        // Send typing indicator
        sendTypingIndicator(boardId, itemId, true);
        
        // Set timeout to stop typing indicator after 2 seconds of inactivity
        typingTimeoutRef.current = setTimeout(() => {
          sendTypingIndicator(boardId, itemId, false);
          typingTimeoutRef.current = null;
        }, 2000);
      }
    }
  };

  // Handle mention selection
  const handleSelectMention = (member: { id: string; firstName: string; lastName: string }) => {
    if (mentionStartIndex === -1) return;
    
    const beforeMention = content.substring(0, mentionStartIndex);
    const afterMention = content.substring(mentionStartIndex + mentionQuery.length + 1);
    const mentionText = `@[${member.firstName} ${member.lastName}]`;
    
    const newContent = beforeMention + mentionText + ' ' + afterMention;
    setContent(newContent);
    setMentions([...mentions, member.id]);
    setIsMentionOpen(false);
    
    // Focus back on textarea and place cursor after the mention
    if (textareaRef.current) {
      const newCursorPosition = beforeMention.length + mentionText.length + 1;
      textareaRef.current.focus();
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = newCursorPosition;
          textareaRef.current.selectionEnd = newCursorPosition;
        }
      }, 0);
    }
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (content.trim()) {
      onSubmit(content.trim(), mentions);
      setContent('');
      setMentions([]);
    }
  };

  // Handle key press
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Submit on Ctrl+Enter or Cmd+Enter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  // Handle conflict resolution
  const handleConflictResolve = (useRemote: boolean, mergedContent?: string) => {
    if (useRemote && mergedContent) {
      setContent(mergedContent);
    }
    setHasConflict(false);
  };

  return (
    <form 
      onSubmit={handleSubmit} 
      className="space-y-3"
      data-item-id={textareaRef.current?.closest('[data-item-id]')?.getAttribute('data-item-id') || ''}
      data-board-id={textareaRef.current?.closest('[data-board-id]')?.getAttribute('data-board-id') || ''}
    >
      {hasConflict && textareaRef.current?.closest('[data-item-id]') && textareaRef.current?.closest('[data-board-id]') && (
        <ConflictResolution
          boardId={textareaRef.current.closest('[data-board-id]')!.getAttribute('data-board-id')!}
          itemId={textareaRef.current.closest('[data-item-id]')!.getAttribute('data-item-id')!}
          currentContent={content}
          onResolve={handleConflictResolve}
        />
      )}
      
      <div className="flex gap-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={user?.avatarUrl} />
          <AvatarFallback>
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="min-h-[80px] resize-none"
          />
          
          <Popover open={isMentionOpen} onOpenChange={setIsMentionOpen}>
            <PopoverTrigger className="hidden" />
            <PopoverContent 
              className="w-[200px] p-0" 
              align="start" 
              side="bottom"
              alignOffset={-40}
              sideOffset={-30}
            >
              <Command>
                <CommandInput placeholder="Search people..." value={mentionQuery} />
                <CommandList>
                  <CommandEmpty>No results found.</CommandEmpty>
                  <CommandGroup>
                    {workspaceMembers?.filter(member => 
                      `${member.firstName} ${member.lastName}`
                        .toLowerCase()
                        .includes(mentionQuery.toLowerCase())
                    ).map((member) => (
                      <CommandItem
                        key={member.id}
                        onSelect={() => handleSelectMention(member)}
                      >
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={member.avatarUrl} />
                            <AvatarFallback>
                              {member.firstName?.[0]}{member.lastName?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span>{member.firstName} {member.lastName}</span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>
      
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => setIsMentionOpen(true)}
          >
            <AtSign className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex gap-2">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCancel}
            >
              Cancel
            </Button>
          )}
          
          <Button
            type="submit"
            size="sm"
            disabled={!content.trim()}
          >
            <Send className="h-4 w-4 mr-1" />
            {buttonText}
          </Button>
        </div>
      </div>
    </form>
  );
}