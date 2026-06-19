import { create } from 'zustand';
import { User, UserRole } from '@/lib/validators';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

interface AuthState {
  currentUser: User | null;
  activeRole: UserRole;
  mockUsers: User[];
  isInitialized: boolean;
  
  initializeAuth: () => Promise<void>;
  signUp: (name: string, email: string, password: string, role: UserRole) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  setRole: (role: UserRole) => void;
  logout: () => Promise<void>;
}

const mockUsersList: User[] = [
  {
    id: 'user-admin-1',
    name: 'Sarah Connor (Admin)',
    email: 'sarah.connor@portal.qa',
    role: 'Admin',
    created_at: new Date('2026-01-01').toISOString(),
  },
  {
    id: 'user-qa-1',
    name: 'Alex Mercer (QA Engineer)',
    email: 'alex.mercer@portal.qa',
    role: 'QA Engineer',
    created_at: new Date('2026-01-05').toISOString(),
  },
  {
    id: 'user-dev-1',
    name: 'Linus Torvalds (Developer)',
    email: 'linus.t@portal.qa',
    role: 'Developer',
    created_at: new Date('2026-01-10').toISOString(),
  },
  {
    id: 'user-rep-1',
    name: 'GIS Team (Reporter)',
    email: 'gis.team@portal.qa',
    role: 'Reporter',
    created_at: new Date('2026-01-15').toISOString(),
  },
];

export const useAuthStore = create<AuthState>((set, get) => ({
  currentUser: null, // Start unauthenticated for login demo
  activeRole: 'Reporter',
  mockUsers: mockUsersList,
  isInitialized: false,

  initializeAuth: async () => {
    if (isSupabaseConfigured()) {
      try {
        const { data: { session } } = await supabase!.auth.getSession();
        if (session?.user) {
          const { data: profile } = await supabase!
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();
            
          if (profile) {
            set({ 
              currentUser: profile, 
              activeRole: profile.role,
              isInitialized: true 
            });
            return;
          }
        }
      } catch (err) {
        console.error("Supabase auth session initialization error", err);
      }
    }
    
    // Local fallback initialization
    const localUser = localStorage.getItem('qa_current_user');
    if (localUser) {
      const parsed = JSON.parse(localUser);
      set({ 
        currentUser: parsed, 
        activeRole: parsed.role,
        isInitialized: true 
      });
    } else {
      set({ isInitialized: true });
    }
  },

  signUp: async (name, email, password, role) => {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase!.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role,
          }
        }
      });
      if (error) throw error;
      
      if (data.user) {
        // Set immediately if possible, or fallback manually
        const { data: profile } = await supabase!
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single();
          
        if (!profile) {
          // Manual client-side insert if trigger has not executed
          const { data: newProfile } = await supabase!
            .from('users')
            .insert({
              id: data.user.id,
              name,
              email,
              role,
            })
            .select()
            .single();
          
          if (newProfile) {
            set({ currentUser: newProfile, activeRole: newProfile.role });
            return;
          }
        } else {
          set({ currentUser: profile, activeRole: profile.role });
          return;
        }
      }
    } else {
      // Mock signup: Save credentials to localStorage
      const usersList = JSON.parse(localStorage.getItem('qa_registered_users') || '[]');
      if (usersList.some((u: any) => u.email === email) || mockUsersList.some((u) => u.email === email)) {
        throw new Error('Email already registered');
      }

      const newUser: User = {
        id: `user-${Date.now()}`,
        name,
        email,
        role,
        created_at: new Date().toISOString(),
      };

      usersList.push({ ...newUser, password });
      localStorage.setItem('qa_registered_users', JSON.stringify(usersList));
      
      set({ currentUser: newUser, activeRole: role });
      localStorage.setItem('qa_current_user', JSON.stringify(newUser));
    }
  },

  signIn: async (email, password) => {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase!.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      
      let { data: profile } = await supabase!
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();
        
      if (!profile) {
        // Client-side fallback insert if Postgres trigger is missing
        const name = data.user.user_metadata?.name || email.split('@')[0];
        const role = data.user.user_metadata?.role || 'Reporter';
        
        const { data: newProfile, error: insertError } = await supabase!
          .from('users')
          .insert({
            id: data.user.id,
            name,
            email,
            role,
          })
          .select()
          .single();
          
        if (insertError) {
          throw new Error('User profile record not found in database and auto-creation failed. Please verify that you have run the schema triggers in the Supabase console.');
        }
        profile = newProfile;
      }
      
      if (profile) {
        set({ currentUser: profile, activeRole: profile.role });
      }
    } else {
      // Check mock seed users first
      const matchedSeed = mockUsersList.find(u => u.email === email);
      if (matchedSeed) {
        // Dummy passwords check: username (e.g. admin123, qa123, dev123, reporter123)
        const expectedPass = matchedSeed.role === 'Admin' ? 'admin123' 
                           : matchedSeed.role === 'QA Engineer' ? 'qa123'
                           : matchedSeed.role === 'Developer' ? 'dev123'
                           : 'reporter123';
                           
        if (password !== expectedPass) {
          throw new Error('Invalid credentials');
        }
        
        set({ currentUser: matchedSeed, activeRole: matchedSeed.role });
        localStorage.setItem('qa_current_user', JSON.stringify(matchedSeed));
        return;
      }

      // Check registered users in localStorage
      const usersList = JSON.parse(localStorage.getItem('qa_registered_users') || '[]');
      const matchedLocal = usersList.find((u: any) => u.email === email && u.password === password);
      
      if (!matchedLocal) {
        throw new Error('Invalid email or password');
      }

      const userProfile: User = {
        id: matchedLocal.id,
        name: matchedLocal.name,
        email: matchedLocal.email,
        role: matchedLocal.role,
        created_at: matchedLocal.created_at,
      };

      set({ currentUser: userProfile, activeRole: userProfile.role });
      localStorage.setItem('qa_current_user', JSON.stringify(userProfile));
    }
  },

  setRole: (role) => {
    set({ activeRole: role });
  },

  logout: async () => {
    if (isSupabaseConfigured()) {
      await supabase!.auth.signOut();
    }
    set({ currentUser: null, activeRole: 'Reporter' });
    localStorage.removeItem('qa_current_user');
  },
}));
