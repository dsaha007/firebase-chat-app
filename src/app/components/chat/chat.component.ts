import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MessageListComponent } from '../message-list/message-list.component';
import { MessageInputComponent } from '../message-input/message-input.component';
import { UserListComponent } from '../user-list/user-list.component';
import { UserLoginComponent } from '../user-login/user-login.component';
import { ChatService, User } from '../../services/chat.service';
import { Observable } from 'rxjs';
@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [
    CommonModule,
    MessageListComponent,
    MessageInputComponent,
    UserListComponent,
    UserLoginComponent,
  ],
  template: `
    @if (!currentUser) {
    <div>
      <app-user-login></app-user-login>
    </div>
    } @if (currentUser) {
    <div class="chat-container" *ngIf="currentUser">
      <app-user-list></app-user-list>
      <div class="chat-area">
        <div class="chat-header">
        <h1>
            {{ (selectedUser$ | async)?.name ? 'Private Chat with ' + (selectedUser$ | async)?.name : 'Chat App' }}
          </h1>


          <div class="user-actions">
            <span class="logged-in-as"
              >Logged in as: <strong>{{ currentUser.name }}</strong></span
            >
          </div>
        </div>
        <app-message-list></app-message-list>
        <app-message-input></app-message-input>
      </div>
    </div>
    }
  `,
  styles: [
    `
      .chat-container {
        display: flex;
        height: 100vh;
        width: 100%;
        overflow: hidden;
      }
      .chat-area {
        flex: 1;
        display: flex;
        flex-direction: column;
      }
      .chat-header {
        padding: 15px 20px;
        background-color: #4caf50;
        color: white;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
        height: 115px;
      }
      h1 {
        margin: 0;
        font-size: 1.5rem;
      }
    `,
  ],
})
export class ChatComponent implements OnInit {
  currentUser: User | null = null;
  selectedUser$: Observable<User | null>;

  constructor(private chatService: ChatService) {
    this.selectedUser$ = this.chatService.selectedUser$;
  }
  ngOnInit(): void {
    // Subscribe to current user
    this.chatService.currentUser$.subscribe((user) => {
      this.currentUser = user;
    });
  }
}
