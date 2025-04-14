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
  receiver: string;
  timestamp: any;
  isPrivate: boolean;
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

  constructor() {
    this.loadUsers();
    this.restoreCurrentUser();
  }

  private loadUsers() {
    const usersRef = collection(this.firestore, 'users');
    collectionData(usersRef, { idField: 'id' })
      .pipe(map((users) => users as User[]))
      .subscribe((users) => {
        this.usersSubject.next(users);

        const currentUser = this.currentUserSubject.getValue();
        if (currentUser) {
          const updated = users.find((u) => u.id === currentUser.id);
          if (updated) this.currentUserSubject.next(updated);
        }

        const selectedUser = this.selectedUserSubject.getValue();
        if (selectedUser) {
          const updated = users.find((u) => u.id === selectedUser.id);
          if (updated) this.selectedUserSubject.next(updated);
        }
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

    return collectionData(messagesQuery, { idField: 'id' }).pipe(
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

    await this.ngZone.run(() =>
      addDoc(messagesRef, {
        text,
        sender,
        receiver: isPrivateChat && selectedUser ? selectedUser.name : 'everyone',
        timestamp: serverTimestamp(),
        isPrivate: isPrivateChat,
      })
    );
  }

  async addUser(name: string): Promise<User | null> {
    try {
      const usersRef = collection(this.firestore, 'users');

      const querySnapshot = await this.ngZone.run(() =>
        getDocs(query(usersRef, where('name', '==', name)))
      );

      if (!querySnapshot.empty) {
        const existing = querySnapshot.docs[0];
        const user = {
          id: existing.id,
          name: existing.data()['name'],
          isOnline: existing.data()['isOnline'],
          avatar: existing.data()['avatar'],
        } as User;

        this.setCurrentUser(user);
        return user;
      } else {
        const newUserRef = await this.ngZone.run(() =>
          addDoc(usersRef, {
            name,
            isOnline: true,
            lastActive: serverTimestamp(),
            avatar: this.generateAvatar(name),
          })
        );

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
      await this.ngZone.run(() =>
        updateDoc(userRef, {
          isOnline,
          lastActive: serverTimestamp(),
        })
      );
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  }

  setCurrentUser(user: User | null): void {
    this.currentUserSubject.next(user);
    if (user) {
      localStorage.setItem('currentUser', JSON.stringify(user));
      this.updateUserStatus(user.id, true);
    } else {
      localStorage.removeItem('currentUser');
    }
  }

  selectUser(user: User | null): void {
    this.selectedUserSubject.next(user);
    this.isPrivateChatSubject.next(!!user);
  }

  private restoreCurrentUser(): void {
    const stored = localStorage.getItem('currentUser');
    if (stored) {
      try {
        const user = JSON.parse(stored) as User;
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
    const current = this.currentUserSubject.getValue();
    if (current) {
      this.updateUserStatus(current.id, false);
    }
    this.setCurrentUser(null);
    this.selectUser(null);
    localStorage.removeItem('currentUser');
  }

  private generateAvatar(name: string): string {
    const colors = [
      '#F44336', '#E91E63', '#9C27B0', '#673AB7',
      '#3F51B5', '#2196F3', '#03A9F4', '#00BCD4',
      '#009688', '#4CAF50', '#8BC34A', '#CDDC39',
      '#FFC107', '#FF9800', '#FF5722',
    ];
    const charSum = name.split('').reduce((sum, c) => sum + c.charCodeAt(0), 0);
    return colors[charSum % colors.length];
  }
}
