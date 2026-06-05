export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
}

export interface UserInfo {
  name: string;
  className: string;
  topic: string;
}
