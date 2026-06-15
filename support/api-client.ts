export type Role = 'CAR_OWNER' | 'WORKSHOP_MANAGER' | 'WORKSHOP_EMPLOYEE' | 'ADMIN';

export interface SignUpRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  requestedRole: Role;
  invitationCode?: string;
}

export interface SignUpResponse {
  message: string;
}

export interface SignInRequest {
  email: string;
  password: string;
}

export interface AuthenticatedUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  isVerified: boolean;
  active: boolean;
  roles: Role[];
  workshopId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface SignInResponse {
  token: string;
  tokenType: string;
  expiresIn: number;
  user: AuthenticatedUser;
}

export interface CreateWorkshopRequest {
  ownerUserId: number;
  name: string;
  shortDescription?: string;
  legalName?: string;
  ruc?: string;
}

export interface WorkshopResource {
  id: number;
  ownerUserId: number;
  name: string;
  shortDescription: string | null;
  legalName: string | null;
  active: boolean;
  trustScore: number | null;
  logoUrl: string | null;
  photoUrls: string[];
  capabilityTags: string[];
  subscriptionStatus: string;
  subscriptionTier: string;
  subscriptionExpiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AddLocationRequest {
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  latitude?: number;
  longitude?: number;
}

export interface LocationResource {
  id: number;
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  active: boolean;
  openingHours: unknown[];
}

export interface AddServiceTemplateRequest {
  code?: string;
  catalogService?: string;
  customName: string;
  description?: string;
  estimatedDurationMinutes: number;
  basePriceAmount?: number;
  currency?: string;
}

export interface ServiceTemplateResource {
  id: number;
  code: string | null;
  catalogService: string | null;
  serviceCategory: string | null;
  customName: string;
  displayName: string;
  description: string | null;
  estimatedDurationMinutes: number;
  basePriceAmount: number | null;
  currency: string | null;
  active: boolean;
  linkedToCatalog: boolean;
  createdAt: string;
  updatedAt: string;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string,
    public readonly endpoint: string,
  ) {
    super(`API ${status} on ${endpoint}: ${body}`);
    this.name = 'ApiError';
  }
}

export class ApiClient {
  constructor(private readonly baseUrl: string) {}

  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    path: string,
    body?: unknown,
    token?: string,
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const text = await res.text();
    if (!res.ok) {
      throw new ApiError(res.status, text, `${method} ${path}`);
    }
    if (!text) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new ApiError(res.status, `Non-JSON response: ${text}`, `${method} ${path}`);
    }
  }

  signup(req: SignUpRequest) {
    return this.request<SignUpResponse>('POST', '/api/v1/users/signup', req);
  }

  signin(req: SignInRequest) {
    return this.request<SignInResponse>('POST', '/api/v1/users/signin', req);
  }

  createWorkshop(req: CreateWorkshopRequest, token: string) {
    return this.request<WorkshopResource>('POST', '/api/v1/workshops', req, token);
  }

  addLocation(req: AddLocationRequest, token: string) {
    return this.request<LocationResource>('POST', '/api/v1/workshops/locations', req, token);
  }

  addServiceTemplate(req: AddServiceTemplateRequest, token: string) {
    return this.request<ServiceTemplateResource>(
      'POST',
      '/api/v1/workshops/service-templates',
      req,
      token,
    );
  }

  getWorkshopServices(workshopId: number) {
    return this.request<ServiceTemplateResource[]>(
      'GET',
      `/api/v1/workshops/${workshopId}/services`,
    );
  }
}
