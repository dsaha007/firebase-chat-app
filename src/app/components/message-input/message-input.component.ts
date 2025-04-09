// src/app/components/message-input/message-input.component.ts
import { Component, OnInit } from '@angular/core';
import { ChatService, User } from '../../services/chat.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-message-input',
  standalone: true,
  imports: [FormsModule, CommonModule],
  template: `
    <div class="message-input-container" *ngIf="currentUser">
      <input 
        type="text" 
        class="message-input" 
        [placeholder]="inputPlaceholder" 
        [(ngModel)]="newMessage" 
        (keyup.enter)="sendMessage()"
        [disabled]="isSending"
      />
      <button 
        class="send-button" 
        (click)="sendMessage()" 
        [disabled]="isSending || !newMessage.trim()">
        <span *ngIf="!isSending">Send</span>
        <span *ngIf="isSending">Sending...</span>
      </button>
    </div>
    
    <div class="not-logged-in" *ngIf="!currentUser">
      <p>Please log in to send messages</p>
    </div>
  `,
  styles: [`
    .message-input-container {
      display: flex;
      padding: 10px;
      background-color: white;
      border-top: 1px solid #e0e0e0;
    }
    .message-input {
      flex: 1;
      padding: 12px;
      border: 1px solid #ddd;
      border-radius: 24px;
      outline: none;
      font-size: 1rem;
    }
    .message-input:disabled {
      background-color: #f5f5f5;
    }
    .send-button {
      margin-left: 10px;
      padding: 0 20px;
      background-color: #4CAF50;
      color: white;
      border: none;
      border-radius: 24px;
      cursor: pointer;
      font-size: 1rem;
      min-width: 80px;
    }
    .send-button:hover:not(:disabled) {
      background-color: #45a049;
    }
    .send-button:disabled {
      background-color: #cccccc;
      cursor: not-allowed;
    }
    .not-logged-in {
      padding: 15px;
      background-color: #f8f8f8;
      border-top: 1px solid #e0e0e0;
      color: #666;
      text-align: center;
      font-size: 0.9rem;
    }
  `]
})
export class MessageInputComponent implements OnInit {
  newMessage = '';
  currentUser: User | null = null;
  selectedUser: User | null = null;
  isSending = false;
  
  get inputPlaceholder(): string {
    if (this.selectedUser) {
      return `Message ${this.selectedUser.name} privately...`;
    }
    return 'Type a message to everyone...';
  }

  constructor(private chatService: ChatService) {}
  
  ngOnInit(): void {
    // Subscribe to current user
    this.chatService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
    
    // Subscribe to selected user for private chat
    this.chatService.selectedUser$.subscribe(user => {
      this.selectedUser = user;
    });
  }

  async sendMessage(): Promise<void> {
    if (this.newMessage.trim() && !this.isSending && this.currentUser) {
      try {
        this.isSending = true;
        await this.chatService.sendMessage(this.newMessage, this.currentUser.name);
        this.newMessage = '';
      } catch (error) {
        console.error('Error sending message:', error);
        // You could show a toast or notification here
      } finally {
        this.isSending = false;
      }
    }
  }
}