import { Injectable, inject, NgZone } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import {
  Firestore,
  collection,
  collectionData,
  addDoc,
  query,
  orderBy,
  serverTimestamp,
  DocumentData,
  where,
  updateDoc,
  doc,
  getDocs,
} from '@angular/fire/firestore';
import { map } from 'rxjs/operators';

export interface Message {
  id?: string;
  text: string;
  sender: string;
  receiver: string; // For private messages
  timestamp: any;
  isPrivate: boolean; // Flag for private messages
}

export interface User {
  id: string;
  name: string;
  isOnline: boolean;
  lastActive?: any;
  avatar?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private firestore = inject(Firestore);
  private ngZone = inject(NgZone);

  private usersSubject = new BehaviorSubject<User[]>([]);
  public users$ = this.usersSubject.asObservable();

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  private selectedUserSubject = new BehaviorSubject<User | null>(null);
  public selectedUser$ = this.selectedUserSubject.asObservable();

  private isPrivateChatSubject = new BehaviorSubject<boolean>(false);
  public isPrivateChat$ = this.isPrivateChatSubject.asObservable();

  private messagesSubject = new BehaviorSubject<Message[]>([]);

  constructor() {
    this.loadUsers();
    this.restoreCurrentUser();
  }

  private loadUsers() {
    const usersRef = collection(this.firestore, 'users');
    collectionData(usersRef, { idField: 'id' })
      .pipe(map((users) => users as User[]))
      .subscribe((users) => {
        this.ngZone.run(() => {
          this.usersSubject.next(users);

          const currentUser = this.currentUserSubject.getValue();
          if (currentUser) {
            const updatedCurrentUser = users.find((u) => u.id === currentUser.id);
            if (updatedCurrentUser) {
              this.currentUserSubject.next(updatedCurrentUser);
            }
          }

          const selectedUser = this.selectedUserSubject.getValue();
          if (selectedUser) {
            const updatedSelectedUser = users.find(
              (u) => u.id === selectedUser.id
            );
            if (updatedSelectedUser) {
              this.selectedUserSubject.next(updatedSelectedUser);
            }
          }
        });
      });
  }

  getMessages(): Observable<Message[]> {
    const messagesRef = collection(this.firestore, 'messages');
    const currentUser = this.currentUserSubject.getValue();
    const selectedUser = this.selectedUserSubject.getValue();
    const isPrivateChat = this.isPrivateChatSubject.getValue();

    let messagesQuery;

    if (isPrivateChat && currentUser && selectedUser) {
      messagesQuery = query(
        messagesRef,
        where('isPrivate', '==', true),
        where('sender', 'in', [currentUser.name, selectedUser.name]),
        where('receiver', 'in', [currentUser.name, selectedUser.name]),
        orderBy('timestamp', 'asc')
      );
    } else {
      messagesQuery = query(
        messagesRef,
        where('isPrivate', '==', false),
        orderBy('timestamp', 'asc')
      );
    }

    collectionData(messagesQuery, { idField: 'id' })
      .pipe(map((messages) => messages as Message[]))
      .subscribe((messages) => this.messagesSubject.next(messages));

    return this.messagesSubject.asObservable().pipe(
      map((messages: DocumentData[]) => {
        return messages.map((msg) => ({
          ...msg,
          timestamp: msg['timestamp']?.toDate() || new Date(),
        })) as Message[];
      })
    );
  }

  getUsers(): Observable<User[]> {
    return this.users$;
  }

  async sendMessage(text: string, sender: string): Promise<void> {
    const messagesRef = collection(this.firestore, 'messages');
    const selectedUser = this.selectedUserSubject.getValue();
    const isPrivateChat = this.isPrivateChatSubject.getValue();

    await addDoc(messagesRef, {
      text,
      sender,
      receiver: isPrivateChat && selectedUser ? selectedUser.name : 'everyone',
      timestamp: serverTimestamp(),
      isPrivate: isPrivateChat,
    });
  }

  async addUser(name: string): Promise<User | null> {
    try {
      const usersRef = collection(this.firestore, 'users');
      const q = query(usersRef, where('name', '==', name));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const existingUserDoc = querySnapshot.docs[0];
        const existingUser = {
          id: existingUserDoc.id,
          name: existingUserDoc.data()['name'],
          isOnline: existingUserDoc.data()['isOnline'],
          avatar: existingUserDoc.data()['avatar'],
        } as User;

        this.setCurrentUser(existingUser);
        return existingUser;
      } else {
        const newUserRef = await addDoc(usersRef, {
          name,
          isOnline: true,
          lastActive: serverTimestamp(),
          avatar: this.generateAvatar(name),
        });

        const newUser = {
          id: newUserRef.id,
          name,
          isOnline: true,
          avatar: this.generateAvatar(name),
        };

        this.setCurrentUser(newUser);
        return newUser;
      }
    } catch (error) {
      console.error('Error adding user:', error);
      return null;
    }
  }

  async updateUserStatus(userId: string, isOnline: boolean): Promise<void> {
    try {
      const userRef = doc(this.firestore, 'users', userId);
      await updateDoc(userRef, {
        isOnline,
        lastActive: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  }

  setCurrentUser(user: User | null): void {
    this.currentUserSubject.next(user);

    if (user) {
      localStorage.setItem('currentUser', JSON.stringify(user));
    } else {
      localStorage.removeItem('currentUser');
    }

    if (user) {
      this.updateUserStatus(user.id, true);
    }
  }

  selectUser(user: User | null): void {
    this.selectedUserSubject.next(user);
    this.isPrivateChatSubject.next(!!user);
    this.getMessages();
  }

  private restoreCurrentUser(): void {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser) as User;
        this.currentUserSubject.next(user);
        this.updateUserStatus(user.id, true);
      } catch (e) {
        console.error('Failed to parse stored user', e);
        localStorage.removeItem('currentUser');
      }
    }
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.getValue();
  }

  logout(): void {
    const currentUser = this.currentUserSubject.getValue();
    if (currentUser) {
      this.updateUserStatus(currentUser.id, false);
    }

    this.setCurrentUser(null);
    this.selectUser(null);
    localStorage.removeItem('currentUser');
  }

  private generateAvatar(name: string): string {
    const colors = [
      '#F44336',
      '#E91E63',
      '#9C27B0',
      '#673AB7',
      '#3F51B5',
      '#2196F3',
      '#03A9F4',
      '#00BCD4',
      '#009688',
      '#4CAF50',
      '#8BC34A',
      '#CDDC39',
      '#FFC107',
      '#FF9800',
      '#FF5722',
    ];

    const charSum = name
      .split('')
      .reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const colorIndex = charSum % colors.length;

    return colors[colorIndex];
  }
}