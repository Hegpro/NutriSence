const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const getHeaders = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('nutrisense_token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const api = {
  // Auth
  async register(data: any) {
    const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Registration failed');
    }
    return res.json();
  },

  async login(data: any) {
    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Login failed');
    }
    return res.json();
  },

  async forgotPassword(email: string) {
    const res = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to request password reset code');
    }
    return res.json();
  },

  async resetPassword(data: any) {
    const res = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Password reset failed');
    }
    return res.json();
  },

  // User details & profile
  async getMe() {
    const res = await fetch(`${API_BASE_URL}/api/users/me`, {
      method: 'GET',
      headers: getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to fetch profile details');
    }
    return res.json();
  },

  async onboard(data: any) {
    const res = await fetch(`${API_BASE_URL}/api/users/onboard`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Onboarding submission failed');
    }
    return res.json();
  },

  async updateProfile(data: any) {
    const res = await fetch(`${API_BASE_URL}/api/users/profile`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Profile update failed');
    }
    return res.json();
  },

  // Meals
  async getTodayMeals() {
    const res = await fetch(`${API_BASE_URL}/api/meals/today`, {
      method: 'GET',
      headers: getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to fetch today\'s meals');
    }
    return res.json();
  },

  async forceGenerateMeals() {
    const res = await fetch(`${API_BASE_URL}/api/meals/generate`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Meal generation trigger failed');
    }
    return res.json();
  },

  async getMealHistory() {
    const res = await fetch(`${API_BASE_URL}/api/meals/history`, {
      method: 'GET',
      headers: getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to fetch historical logs');
    }
    return res.json();
  },

  // Progress Logging
  async getTodayProgress() {
    const res = await fetch(`${API_BASE_URL}/api/progress/today`, {
      method: 'GET',
      headers: getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to load today\'s logged progress');
    }
    return res.json();
  },

  async logProgress(data: any) {
    const res = await fetch(`${API_BASE_URL}/api/progress/log`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to save daily progress');
    }
    return res.json();
  },

  async getProgressStats() {
    const res = await fetch(`${API_BASE_URL}/api/progress/stats`, {
      method: 'GET',
      headers: getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to fetch weekly progress stats');
    }
    return res.json();
  },

  // LangGraph pipeline canvas
  async getPipelineConfig() {
    const res = await fetch(`${API_BASE_URL}/api/pipeline/config`, {
      method: 'GET',
      headers: getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to load pipeline configs');
    }
    return res.json();
  },

  async savePipelineConfig(data: { nodes: string; edges: string }) {
    const res = await fetch(`${API_BASE_URL}/api/pipeline/config`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to update pipeline configurations');
    }
    return res.json();
  },

  async testPipeline() {
    const res = await fetch(`${API_BASE_URL}/api/pipeline/test`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Pipeline simulation dry-run failed');
    }
    return res.json();
  },
};
