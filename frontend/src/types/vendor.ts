export interface Vendor {
  id: string;
  full_name: string;
  username?: string;
  email: string;
  status: string;
  store_name?: string;
  store_description?: string;
  profile_image?: string | null;
  phone?: string;
  phone_number?: string;
  address?: string;
  date_joined?: string;
  created_at?: string;
  // Add more fields as needed
}

export interface VendorListResponse {
  count: number;
  results: Vendor[];
}

export interface VendorResponse extends Vendor {}
