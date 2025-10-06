// NextAuth v5 session type compatibility
export interface SessionWithUser {
  user?: { 
    id?: string; 
    email?: string; 
    name?: string; 
    image?: string;
  };
}
