import { Injectable } from '@angular/core';
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
  private usersSubject = new BehaviorSubject<User[]>([]);
  public users$ = this.usersSubject.asObservable();

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  private selectedUserSubject = new BehaviorSubject<User | null>(null);
  public selectedUser$ = this.selectedUserSubject.asObservable();

  // Track if we're in private chat mode
  private isPrivateChatSubject = new BehaviorSubject<boolean>(false);
  public isPrivateChat$ = this.isPrivateChatSubject.asObservable();

  // Private subject to trigger message updates
  private messagesSubject = new BehaviorSubject<Message[]>([]);

  constructor(private firestore: Firestore) {
    // Load users from Firestore
    this.loadUsers();

    // Try to restore the current user from localStorage
    this.restoreCurrentUser();
  }

  private loadUsers() {
    const usersRef = collection(this.firestore, 'users');
    collectionData(usersRef, { idField: 'id' })
      .pipe(map((users) => users as User[]))
      .subscribe((users) => {
        this.usersSubject.next(users);

        // If we have a stored current user ID, update their full details from the fetched users
        const currentUser = this.currentUserSubject.getValue();
        if (currentUser) {
          const updatedCurrentUser = users.find((u) => u.id === currentUser.id);
          if (updatedCurrentUser) {
            this.currentUserSubject.next(updatedCurrentUser);
          }
        }

        // Also update selected user if we have one
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
  }

  getMessages(): Observable<Message[]> {
    const messagesRef = collection(this.firestore, 'messages');
    const currentUser = this.currentUserSubject.getValue();
    const selectedUser = this.selectedUserSubject.getValue();
    const isPrivateChat = this.isPrivateChatSubject.getValue();

    let messagesQuery;

    if (isPrivateChat && currentUser && selectedUser) {
      // For private chats, get messages between current user and selected user
      messagesQuery = query(
        messagesRef,
        where('isPrivate', '==', true),
        where('sender', 'in', [currentUser.name, selectedUser.name]),
        where('receiver', 'in', [currentUser.name, selectedUser.name]),
        orderBy('timestamp', 'asc')
      );
    } else {
      // For public chat, get non-private messages
      messagesQuery = query(
        messagesRef,
        where('isPrivate', '==', false),
        orderBy('timestamp', 'asc')
      );
    }

        // Set messages subject
    collectionData(messagesQuery, { idField: 'id' }).pipe(
        map((messages) => messages as Message[])
    ).subscribe((messages) => this.messagesSubject.next(messages));

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
        // User already exists
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
        // User does not exist, create a new user
        const newUserRef = await addDoc(usersRef, {
          name,
          isOnline: true,
          lastActive: serverTimestamp(),
          avatar: this.generateAvatar(name),
        });

        // Get the newly created user
        const newUser = {
          id: newUserRef.id,
          name,
          isOnline: true,
          avatar: this.generateAvatar(name),
        };

        // Set as current user
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

    // Store in localStorage for persistence
    if (user) {
      localStorage.setItem('currentUser', JSON.stringify(user));
    } else {
      localStorage.removeItem('currentUser');
    }

    // Update online status if we have a user
    if (user) {
      this.updateUserStatus(user.id, true);
    }
  }

  selectUser(user: User | null): void {
    this.selectedUserSubject.next(user);
    this.isPrivateChatSubject.next(!!user);

    // Trigger a message update
    this.getMessages();

  }

  private restoreCurrentUser(): void {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser) as User;
        this.currentUserSubject.next(user);

        // Update online status
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
      // Set user as offline
      this.updateUserStatus(currentUser.id, false);
    }

    // Clear current user
    this.setCurrentUser(null);

    // Reset selected user and go back to public chat
    this.selectUser(null);
    localStorage.removeItem('currentUser');
  }

  private generateAvatar(name: string): string {
    // Generate a random color based on the name
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

    // Use the sum of char codes for consistent color per name
    const charSum = name
      .split('')
      .reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const colorIndex = charSum % colors.length;

    return colors[colorIndex];
  }
}

//CHAT SERVICE WITHOUT USING NgZone and Inject and Only Using Constructors
// import { Injectable } from '@angular/core';
// import { BehaviorSubject, Observable } from 'rxjs';
// import {
//   Firestore,
//   collection,
//   collectionData,
//   addDoc,
//   query,
//   orderBy,
//   serverTimestamp,
//   DocumentData,
//   where,
//   updateDoc,
//   doc,
//   getDocs,
// } from '@angular/fire/firestore';
// import { map } from 'rxjs/operators';

// export interface Message {
//   id?: string;
//   text: string;
//   sender: string;
//   receiver: string; // For private messages
//   timestamp: any;
//   isPrivate: boolean; // Flag for private messages
// }

// export interface User {
//   id: string;
//   name: string;
//   isOnline: boolean;
//   lastActive?: any;
//   avatar?: string;
// }

// @Injectable({
//   providedIn: 'root',
// })
// export class ChatService {
//   private usersSubject = new BehaviorSubject<User[]>([]);
//   public users$ = this.usersSubject.asObservable();

//   private currentUserSubject = new BehaviorSubject<User | null>(null);
//   public currentUser$ = this.currentUserSubject.asObservable();

//   private selectedUserSubject = new BehaviorSubject<User | null>(null);
//   public selectedUser$ = this.selectedUserSubject.asObservable();

//   // Track if we're in private chat mode
//   private isPrivateChatSubject = new BehaviorSubject<boolean>(false);
//   public isPrivateChat$ = this.isPrivateChatSubject.asObservable();

//   // Private subject to trigger message updates
//   private messagesSubject = new BehaviorSubject<Message[]>([]);

//   constructor(private firestore: Firestore) {
//     // Load users from Firestore
//     this.loadUsers();

//     // Try to restore the current user from localStorage
//     this.restoreCurrentUser();
//   }

//   private loadUsers() {
//     const usersRef = collection(this.firestore, 'users');
//     collectionData(usersRef, { idField: 'id' })
//       .pipe(map((users) => users as User[]))
//       .subscribe((users) => {
//         this.usersSubject.next(users);

//         // If we have a stored current user ID, update their full details from the fetched users
//         const currentUser = this.currentUserSubject.getValue();
//         if (currentUser) {
//           const updatedCurrentUser = users.find((u) => u.id === currentUser.id);
//           if (updatedCurrentUser) {
//             this.currentUserSubject.next(updatedCurrentUser);
//           }
//         }

//         // Also update selected user if we have one
//         const selectedUser = this.selectedUserSubject.getValue();
//         if (selectedUser) {
//           const updatedSelectedUser = users.find(
//             (u) => u.id === selectedUser.id
//           );
//           if (updatedSelectedUser) {
//             this.selectedUserSubject.next(updatedSelectedUser);
//           }
//         }
//       });
//   }

//   getMessages(): Observable<Message[]> {
//     const messagesRef = collection(this.firestore, 'messages');
//     const currentUser = this.currentUserSubject.getValue();
//     const selectedUser = this.selectedUserSubject.getValue();
//     const isPrivateChat = this.isPrivateChatSubject.getValue();

//     let messagesQuery;

//     if (isPrivateChat && currentUser && selectedUser) {
//       // For private chats, get messages between current user and selected user
//       messagesQuery = query(
//         messagesRef,
//         where('isPrivate', '==', true),
//         where('sender', 'in', [currentUser.name, selectedUser.name]),
//         where('receiver', 'in', [currentUser.name, selectedUser.name]),
//         orderBy('timestamp', 'asc')
//       );
//     } else {
//       // For public chat, get non-private messages
//       messagesQuery = query(
//         messagesRef,
//         where('isPrivate', '==', false),
//         orderBy('timestamp', 'asc')
//       );
//     }

//         // Set messages subject
//     collectionData(messagesQuery, { idField: 'id' }).pipe(
//         map((messages) => messages as Message[])
//     ).subscribe((messages) => this.messagesSubject.next(messages));

//     return this.messagesSubject.asObservable().pipe(
//       map((messages: DocumentData[]) => {
//         return messages.map((msg) => ({
//           ...msg,
//           timestamp: msg['timestamp']?.toDate() || new Date(),
//         })) as Message[];
//       })
//     );
//   }

//   getUsers(): Observable<User[]> {
//     return this.users$;
//   }

//   async sendMessage(text: string, sender: string): Promise<void> {
//     const messagesRef = collection(this.firestore, 'messages');
//     const selectedUser = this.selectedUserSubject.getValue();
//     const isPrivateChat = this.isPrivateChatSubject.getValue();

//     await addDoc(messagesRef, {
//       text,
//       sender,
//       receiver: isPrivateChat && selectedUser ? selectedUser.name : 'everyone',
//       timestamp: serverTimestamp(),
//       isPrivate: isPrivateChat,
//     });
//   }

//   async addUser(name: string): Promise<User | null> {
//     try {
//       const usersRef = collection(this.firestore, 'users');
//       const q = query(usersRef, where('name', '==', name));
//       const querySnapshot = await getDocs(q);

//       if (!querySnapshot.empty) {
//         // User already exists
//         const existingUserDoc = querySnapshot.docs[0];
//         const existingUser = {
//           id: existingUserDoc.id,
//           name: existingUserDoc.data()['name'],
//           isOnline: existingUserDoc.data()['isOnline'],
//           avatar: existingUserDoc.data()['avatar'],
//         } as User;

//         this.setCurrentUser(existingUser);
//         return existingUser;
//       } else {
//         // User does not exist, create a new user
//         const newUserRef = await addDoc(usersRef, {
//           name,
//           isOnline: true,
//           lastActive: serverTimestamp(),
//           avatar: this.generateAvatar(name),
//         });

//         // Get the newly created user
//         const newUser = {
//           id: newUserRef.id,
//           name,
//           isOnline: true,
//           avatar: this.generateAvatar(name),
//         };

//         // Set as current user
//         this.setCurrentUser(newUser);

//         return newUser;
//       }
//     } catch (error) {
//       console.error('Error adding user:', error);
//       return null;
//     }
//   }

//   async updateUserStatus(userId: string, isOnline: boolean): Promise<void> {
//     try {
//       const userRef = doc(this.firestore, 'users', userId);
//       await updateDoc(userRef, {
//         isOnline,
//         lastActive: serverTimestamp(),
//       });
//     } catch (error) {
//       console.error('Error updating user status:', error);
//     }
//   }

//   setCurrentUser(user: User | null): void {
//     this.currentUserSubject.next(user);

//     // Store in localStorage for persistence
//     if (user) {
//       localStorage.setItem('currentUser', JSON.stringify(user));
//     } else {
//       localStorage.removeItem('currentUser');
//     }

//     // Update online status if we have a user
//     if (user) {
//       this.updateUserStatus(user.id, true);
//     }
//   }

//   selectUser(user: User | null): void {
//     this.selectedUserSubject.next(user);
//     this.isPrivateChatSubject.next(!!user);

//     // Trigger a message update
//     this.getMessages();

//   }

//   private restoreCurrentUser(): void {
//     const storedUser = localStorage.getItem('currentUser');
//     if (storedUser) {
//       try {
//         const user = JSON.parse(storedUser) as User;
//         this.currentUserSubject.next(user);

//         // Update online status
//         this.updateUserStatus(user.id, true);
//       } catch (e) {
//         console.error('Failed to parse stored user', e);
//         localStorage.removeItem('currentUser');
//       }
//     }
//   }

//   getCurrentUser(): User | null {
//     return this.currentUserSubject.getValue();
//   }

//   logout(): void {
//     const currentUser = this.currentUserSubject.getValue();
//     if (currentUser) {
//       // Set user as offline
//       this.updateUserStatus(currentUser.id, false);
//     }

//     // Clear current user
//     this.setCurrentUser(null);

//     // Reset selected user and go back to public chat
//     this.selectUser(null);
//     localStorage.removeItem('currentUser');
//   }

//   private generateAvatar(name: string): string {
//     // Generate a random color based on the name
//     const colors = [
//       '#F44336',
//       '#E91E63',
//       '#9C27B0',
//       '#673AB7',
//       '#3F51B5',
//       '#2196F3',
//       '#03A9F4',
//       '#00BCD4',
//       '#009688',
//       '#4CAF50',
//       '#8BC34A',
//       '#CDDC39',
//       '#FFC107',
//       '#FF9800',
//       '#FF5722',
//     ];

//     // Use the sum of char codes for consistent color per name
//     const charSum = name
//       .split('')
//       .reduce((sum, char) => sum + char.charCodeAt(0), 0);
//     const colorIndex = charSum % colors.length;

//     return colors[colorIndex];
//   }
// }