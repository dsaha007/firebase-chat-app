import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService, User } from '../../services/chat.service';

@Component({
  selector: 'app-user-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-container">
      <div class="login-card">
        <h1>Angular 18 Chat</h1>
        
        <div *ngIf="!currentUser">
          <div class="card-section">
            <h2>Select a User</h2>
            <div class="user-list">
              <div 
                *ngFor="let user of users" 
                class="user-item"
                [class.offline]="!user.isOnline" 
                (click)="selectExistingUser(user)"
              >
                <div class="user-avatar" [style.background-color]="user.avatar || '#ccc'">
                  {{ user.name.charAt(0) }}
                </div>
                <span class="user-name">{{ user.name }}</span>
                <span class="status-badge" [class.offline]="!user.isOnline">
                  {{ user.isOnline ? 'Online' : 'Offline' }}
                </span>
              </div>
              
              <div *ngIf="users.length === 0" class="no-users">
                No users available. Create a new user below.
              </div>
            </div>
          </div>
          
          <div class="card-section">
            <h2>Create New User</h2>
            <div class="create-user-form">
              <input 
                type="text" 
                [(ngModel)]="newUserName" 
                placeholder="Enter your name" 
                (keyup.enter)="createNewUser()"
              />
              <button 
                [disabled]="!newUserName.trim() || creatingUser" 
                (click)="createNewUser()"
              >
                {{ creatingUser ? 'Creating...' : 'Join Chat' }}
              </button>
            </div>
          </div>
        </div>
        
        <div *ngIf="currentUser" class="user-selected">
          <p>Logged in as: <strong>{{ currentUser.name }}</strong></p>
          <div class="action-buttons">
            <button class="enter-btn" (click)="enterChat()">Enter Chat</button>
            <button class="logout-btn" (click)="logout()">Logout</button>
          </div>
        </div>
      </div>
    </div>
  `,
  // Styles omitted for brevity
})
export class UserLoginComponent implements OnInit {
  users: User[] = [];
  currentUser: User | null = null;
  newUserName = '';
  creatingUser = false;
  showChat = false;
  
  constructor(private chatService: ChatService) {}
  
  ngOnInit(): void {
    // Load users
    this.chatService.getUsers().subscribe(users => {
      this.users = users;
    });
    
    // Check if user is already logged in
    this.chatService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
  }
  
  async createNewUser(): Promise<void> {
    if (this.newUserName.trim() && !this.creatingUser) {
      this.creatingUser = true;
      try {
        const newUser = await this.chatService.addUser(this.newUserName.trim());
        if (newUser) {
          this.currentUser = newUser;
        }
      } catch (error) {
        console.error('Error creating user:', error);
      } finally {
        this.creatingUser = false;
        this.newUserName = '';
      }
    }
  }
  
  selectExistingUser(user: User): void {
    this.chatService.setCurrentUser(user);
    this.currentUser = user;
  }
  
  enterChat(): void {
    this.showChat = true;
  }
  
  logout(): void {
    this.chatService.logout();
    this.currentUser = null;
  }
}