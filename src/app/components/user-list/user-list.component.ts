import { Component, OnInit } from '@angular/core';
import { ChatService, User } from '../../services/chat.service';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="user-list">
      <h2>Active Users</h2>
      
      @if (loadingUsers) {
        <div class="loading-users">
          <div class="loading-spinner"></div>
          <span>Loading users...</span>
        </div>
      }
      
      <ul>
        @for (user of users$ | async; track user.id) {
          <li [class.active]="user.name === currentUser" [class.offline]="!user.isOnline">
            <div class="user-avatar">{{ user.name.charAt(0) }}</div>
            <span class="user-name">{{ user.name }}</span>
            <span class="status-indicator" [class.offline]="!user.isOnline"></span>
          </li>
        }
      </ul>
      
      <div class="add-user-section">
        <button class="add-user-btn" (click)="showAddUserForm = !showAddUserForm">
          {{ showAddUserForm ? 'Cancel' : '+ Add User' }}
        </button>
        
        @if (showAddUserForm) {
          <div class="add-user-form">
            <input
              type="text"
              placeholder="User name"
              [(ngModel)]="newUserName"
              (keyup.enter)="addUser()"
            />
            <button 
              [disabled]="!newUserName.trim() || addingUser"
              (click)="addUser()"
            >
              {{ addingUser ? 'Adding...' : 'Add' }}
            </button>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .user-list {
      width: 250px;
      background-color: #2c3e50;
      color: white;
      padding: 15px;
      height: 100%;
      display: flex;
      flex-direction: column;
    }
    h2 {
      font-size: 1.2rem;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 1px solid #34495e;
    }
    ul {
      list-style: none;
      padding: 0;
      margin: 0;
      flex: 1;
      overflow-y: auto;
    }
    li {
      display: flex;
      align-items: center;
      padding: 10px;
      cursor: pointer;
      border-radius: 5px;
      margin-bottom: 5px;
    }
    li:hover {
      background-color: #34495e;
    }
    li.active {
      background-color: #3498db;
    }
    li.offline {
      opacity: 0.6;
    }
    .user-avatar {
      width: 35px;
      height: 35px;
      background-color: #7f8c8d;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 10px;
      font-weight: bold;
    }
    .user-name {
      flex: 1;
    }
    .status-indicator {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background-color: #2ecc71;
      margin-left: 10px;
    }
    .status-indicator.offline {
      background-color: #95a5a6;
    }
    .loading-users {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 20px;
      color: #ecf0f1;
      font-size: 0.9rem;
    }
    .loading-spinner {
      width: 20px;
      height: 20px;
      border: 2px solid #ecf0f1;
      border-top: 2px solid #3498db;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 10px;
    }
    .add-user-section {
      margin-top: auto;
      padding-top: 15px;
      border-top: 1px solid #34495e;
    }
    .add-user-btn {
      width: 100%;
      padding: 8px;
      background-color: #3498db;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.9rem;
    }
    .add-user-btn:hover {
      background-color: #2980b9;
    }
    .add-user-form {
      margin-top: 10px;
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    .add-user-form input {
      padding: 8px;
      border: none;
      border-radius: 4px;
      font-size: 0.9rem;
    }
    .add-user-form button {
      padding: 8px;
      background-color: #2ecc71;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.9rem;
    }
    .add-user-form button:hover:not(:disabled) {
      background-color: #27ae60;
    }
    .add-user-form button:disabled {
      background-color: #95a5a6;
      cursor: not-allowed;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `]
})
export class UserListComponent implements OnInit {
  users$: Observable<User[]>;
  currentUser = 'Alice'; // In a real app, this would be the logged-in user
  loadingUsers = true;
  showAddUserForm = false;
  newUserName = '';
  addingUser = false;

  constructor(private chatService: ChatService) {
    this.users$ = this.chatService.getUsers();
  }

  ngOnInit(): void {
    this.users$.subscribe({
      next: () => this.loadingUsers = false,
      error: (err) => {
        console.error('Error loading users:', err);
        this.loadingUsers = false;
      }
    });
  }
  
  async addUser(): Promise<void> {
    if (this.newUserName.trim() && !this.addingUser) {
      try {
        this.addingUser = true;
        await this.chatService.addUser(this.newUserName.trim());
        this.newUserName = '';
        this.showAddUserForm = false;
      } catch (error) {
        console.error('Error adding user:', error);
      } finally {
        this.addingUser = false;
      }
    }
  }
}