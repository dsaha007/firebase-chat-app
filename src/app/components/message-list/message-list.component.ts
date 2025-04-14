// src/app/components/message-list/message-list.component.ts
import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  AfterViewChecked,
} from '@angular/core';
import { ChatService, Message, User } from '../../services/chat.service';
import { Observable } from 'rxjs';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-message-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="message-list" #messageContainer>
      <div class="chat-info" *ngIf="selectedUser">
        <div
          class="user-avatar"
          [style.background-color]="selectedUser.avatar || '#ccc'"
        >
          {{ selectedUser.name.charAt(0) }}
        </div>
        <div class="chat-with">
          Chatting with <strong>{{ selectedUser.name }}</strong>
          <span class="status" [class.offline]="!selectedUser.isOnline">
            {{ selectedUser.isOnline ? 'Online' : 'Offline' }}
          </span>
        </div>
        <button class="back-button" (click)="goBackToPublicChat()">
          ← Public Chat
        </button>
      </div>

      <div class="chat-info" *ngIf="!selectedUser">
        <div class="public-chat-icon">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
        </div>
        <div class="chat-with">
          <strong>Public Chat</strong>
          <span class="status">Everyone can see these messages</span>
        </div>
      </div>

      <!-- Loading indicator -->
      <div class="loading-messages" *ngIf="loading">
        <div class="loading-spinner"></div>
        <span>Loading messages...</span>
      </div>

      <!-- Debug info -->
      <div class="debug-info" *ngIf="debug">
        <p>Current User: {{ currentUser?.name }}</p>
        <p>Selected User: {{ selectedUser?.name }}</p>
        <p>Private Chat: {{ isPrivateChat ? 'Yes' : 'No' }}</p>
        <p>Messages Count: {{ (messages | async)?.length || 0 }}</p>
      </div>

      <!-- Message list -->
      <ng-container *ngIf="messages | async as messageList">
        <div
          class="message"
          *ngFor="let message of messageList; trackBy: trackById"
          [ngClass]="{
            'own-message': message.sender === currentUser?.name,
            'private-message': message.isPrivate
          }"
        >
          <div class="message-header">
            <span class="sender">{{
              message.sender !== currentUser?.name ? message.sender : ''
            }}</span>
            <span class="timestamp">{{
              message.timestamp | date : 'short'
            }}</span>
          </div>
          <div class="message-content">{{ message.text }}</div>
          <div class="message-footer" *ngIf="message.isPrivate">
            <span class="private-badge">Private</span>
          </div>
        </div>

        <!-- No messages state -->
        <div class="no-messages" *ngIf="messageList.length === 0 && !loading">
          <p *ngIf="!selectedUser">
            No messages in the public chat yet. Be the first to send a message!
          </p>
          <p *ngIf="selectedUser">
            No private messages with {{ selectedUser.name }} yet. Start the
            conversation!
          </p>
        </div>
      </ng-container>
    </div>
  `,
  styles: [
    `
      .message-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
        padding: 10px 20px 20px;
        height: 70vh;
        overflow-y: auto;
        background-color: #f5f5f5;
        border-radius: 8px;
        scroll-behavior: smooth;
        height: calc(100vh - 96px - 68px);
      }

      .chat-info {
        display: flex;
        align-items: center;
        padding: 10px 15px;
        background-color: white;
        border-radius: 8px;
        margin-bottom: 10px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      }

      .user-avatar,
      .public-chat-icon {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-right: 15px;
        color: white;
        font-weight: bold;
      }

      .public-chat-icon {
        background-color: #4caf50;
      }

      .chat-with {
        flex: 1;
        display: flex;
        flex-direction: column;
      }

      .status {
        font-size: 12px;
        color: #666;
      }

      .status.offline {
        color: #999;
      }

      .back-button {
        padding: 5px 10px;
        background-color: #f0f0f0;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        color: #333;
      }

      .back-button:hover {
        background-color: #e0e0e0;
      }

      .message {
        padding: 10px 15px;
        border-radius: 8px;
        max-width: fit-content;
        background-color: #e1e1e1;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        animation: fadeIn 0.3s ease-in;
      }

      .own-message {
        align-self: flex-end;
        background-color: #dcf8c6;
      }

      .private-message {
        background-color: #fff8dc;
      }

      .own-message.private-message {
        background-color: #e6f7ff;
      }

      .message-header {
        display: flex;
        justify-content: space-between;
        margin-bottom: 5px;
        font-size: 0.8rem;
      }

      .sender {
        font-weight: bold;
      }

      .timestamp {
        color: #666;
        font-size: 0.7rem;
        padding: 0 0.5rem;
      }

      .message-content {
        word-break: break-word;
      }

      .message-footer {
        margin-top: 5px;
        display: flex;
        justify-content: flex-end;
      }

      .private-badge {
        font-size: 11px;
        padding: 2px 6px;
        background-color: rgba(0, 0, 0, 0.1);
        border-radius: 10px;
        color: #555;
      }

      .loading-messages {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 20px;
        color: #666;
      }

      .loading-spinner {
        width: 30px;
        height: 30px;
        border: 3px solid #f3f3f3;
        border-top: 3px solid #3498db;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-bottom: 10px;
      }

      .no-messages {
        text-align: center;
        color: #666;
        padding: 20px;
      }

      .debug-info {
        background-color: #fff8e1;
        padding: 10px;
        border-radius: 5px;
        margin-bottom: 10px;
        font-size: 12px;
        color: #333;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes spin {
        0% {
          transform: rotate(0deg);
        }
        100% {
          transform: rotate(360deg);
        }
      }
    `,
  ],
})
export class MessageListComponent implements OnInit, AfterViewChecked {
  messages: Observable<Message[]>;
  currentUser: User | null = null;
  selectedUser: User | null = null;
  isPrivateChat = true;
  loading = true;
  debug = true; // Set to true to show debug info

  @ViewChild('messageContainer') private messageContainer!: ElementRef;

  constructor(private chatService: ChatService) {
    this.messages = this.chatService.getMessages();
  }

  ngOnInit(): void {
    // Subscribe to messages to detect loading state
    this.messages.subscribe({
      next: (messages) => {
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading messages:', err);
        this.loading = false;
      },
    });

    // Subscribe to current user
    this.chatService.currentUser$.subscribe((user) => {
      this.currentUser = user;
    });

    // Subscribe to selected user for private chat
    this.chatService.selectedUser$.subscribe((user) => {
      this.selectedUser = user;
    });

    // Subscribe to private chat mode
    this.chatService.isPrivateChat$.subscribe((isPrivate) => {
      this.isPrivateChat = isPrivate;
    });
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  private scrollToBottom(): void {
    try {
      const element = this.messageContainer.nativeElement;
      element.scrollTop = element.scrollHeight;
    } catch (err) {
      console.error('Error scrolling to bottom:', err);
    }
  }

  goBackToPublicChat(): void {
    this.chatService.selectUser(null);
  }

  // Track messages by ID for better performance
  trackById(index: number, message: Message): string {
    return message.id || index.toString();
  }
}
