class MockQueryBuilder {
  private table: string;
  private action: string = 'select';
  private data: any = null;
  private filters: any[] = [];
  private orderBy: any = null;
  private isSingle: boolean = false;

  constructor(table: string) {
    this.table = table;
  }

  select(columns?: string) {
    this.action = 'select';
    return this;
  }

  insert(data: any) {
    this.action = 'insert';
    this.data = data;
    return this;
  }

  update(data: any) {
    this.action = 'update';
    this.data = data;
    return this;
  }

  delete() {
    this.action = 'delete';
    return this;
  }

  eq(column: string, value: any) {
    this.filters.push({ column, operator: 'eq', value });
    return this;
  }

  in(column: string, values: any[]) {
    this.filters.push({ column, operator: 'in', value: values });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orderBy = { column, ascending: options?.ascending !== false };
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  // Make it behaves like a Promise (thenable)
  async then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
    try {
      const response = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: this.action,
          table: this.table,
          data: this.data,
          filters: this.filters,
          orderBy: this.orderBy
        })
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || 'Database error');
      }

      let resultData = json.data;
      if (this.isSingle) {
        resultData = resultData && resultData.length > 0 ? resultData[0] : null;
      }

      const res = { data: resultData, error: null };
      return onfulfilled ? onfulfilled(res) : res;
    } catch (err: any) {
      console.error('Mock Client Query Error:', err);
      const res = { data: null, error: { message: err.message || 'Database error' } };
      return onfulfilled ? onfulfilled(res) : res;
    }
  }
}

class MockAuthClient {
  async getSession() {
    const localUser = localStorage.getItem('qa_current_user');
    if (localUser) {
      const parsed = JSON.parse(localUser);
      return {
        data: {
          session: {
            user: { id: parsed.id, email: parsed.email }
          }
        },
        error: null
      };
    }
    return { data: { session: null }, error: null };
  }

  async signUp({ email, password, options }: any) {
    try {
      const name = options?.data?.name || 'New User';
      const role = options?.data?.role || 'Reporter';
      const newUserId = crypto.randomUUID();

      // Insert into our PG users table via our API route
      const response = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'insert',
          table: 'users',
          data: {
            id: newUserId,
            name,
            email,
            role,
            created_at: new Date().toISOString()
          }
        })
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || 'Sign up failed');
      }

      return {
        data: {
          user: { id: newUserId, email }
        },
        error: null
      };
    } catch (err: any) {
      return { data: { user: null }, error: { message: err.message } };
    }
  }

  async signInWithPassword({ email, password }: any) {
    try {
      // Find user by email from PG users table
      const response = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'select',
          table: 'users',
          filters: [{ column: 'email', operator: 'eq', value: email }]
        })
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || 'Sign in failed');
      }

      const users = json.data;
      if (!users || users.length === 0) {
        throw new Error('User not found. Please register first.');
      }

      const user = users[0];
      return {
        data: {
          user: { id: user.id, email: user.email },
          session: { user: { id: user.id, email: user.email } }
        },
        error: null
      };
    } catch (err: any) {
      return { data: { user: null, session: null }, error: { message: err.message } };
    }
  }

  async signOut() {
    localStorage.removeItem('qa_current_user');
    return { error: null };
  }
}

class MockSupabaseClient {
  auth = new MockAuthClient();

  from(table: string) {
    return new MockQueryBuilder(table);
  }
}

export const isSupabaseConfigured = (): boolean => {
  return true; // Always return true to run database mode!
};

export const supabase = new MockSupabaseClient() as any;
