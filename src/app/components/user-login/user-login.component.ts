import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../services/chat.service';

@Component({
  selector: 'app-user-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-container">
      <div class="modal">
        <div class="modal-content" [ngClass]="{ closing: closing }">
          <div class="form-container">
            <input
              type="text"
              class="name-input"
              name="name"
              placeholder="Enter your name..."
              [(ngModel)]="newUserName"
              (keyup.enter)="createNewUser()"
            />
            <button
              [disabled]="!newUserName"
              class="create-btn"
              (click)="createNewUser()"
            >
              Join Chat
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .login-container {
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
        min-width: 100vw;
        background-color: #f0f0f0;
      }

      /* Modal styles */
      .modal {
        position: fixed; /* Stay in place */
        z-index: 1; /* Sit on top */
        left: 0;
        top: 0;
        width: 100%; /* Full width */
        height: 100%; /* Full height */
        overflow: auto; /* Enable scroll if needed */
        background-color: rgba(0, 0, 0, 0.4); /* Black w/ opacity */
      }

      .modal-content {
        background-color: #fefefe;
        margin: 15% auto; /* 15% from the top and centered */
        padding: 20px;
        border: 1px solid #888;
        width: 30%;
        animation-duration: 0.2s;
        animation-fill-mode: forwards; /* Keep the final state */
        &.closing {
          animation-name: animatetop;
        }
      }

      /* Add Animation */
      @keyframes animatetop {
        from {
          opacity: 1;
        }
        to {
          opacity: 0;
        }
      }

      /* Form styles */
      .form-container {
        display: flex;
        flex-direction: column;
      }

      .name-input {
        padding: 8px;
        margin-bottom: 10px;
        border: 1px solid #ccc;
        border-radius: 4px;
      }

      .create-btn {
        background-color: #4caf50;
        color: white;
        padding: 10px 20px;
        border: none;
        cursor: pointer;
        border-radius: 5px;
        transition: all 0.2s;
        &:hover {
          background-color: #3e9642;
        }
        &[disabled] {
          background-color: #c4c8c2;
          cursor: default;
        }
      }
    `,
  ],
})
export class UserLoginComponent {
  newUserName = '';
  creatingUser = false;
  closing = false;

  constructor(private chatService: ChatService) {}

  async createNewUser(): Promise<void> {
    if (this.newUserName.trim() && !this.creatingUser) {
      this.creatingUser = true;
      try {
        await this.chatService.addUser(this.newUserName.trim());
      } catch (error) {
        console.error('Error creating user:', error);
      } finally {
        this.creatingUser = false;
        this.newUserName = '';
      }
    }
  }
}
