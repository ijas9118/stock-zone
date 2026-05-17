export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1";
  };
  public: {
    Tables: {
      brands: {
        Row: {
          created_at: string;
          id: string;
          is_active: boolean;
          name: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          cat_code: string;
          category_name: string;
          created_at: string;
          description: string | null;
          id: string;
          updated_at: string;
        };
        Insert: {
          cat_code: string;
          category_name: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          updated_at?: string;
        };
        Update: {
          cat_code?: string;
          category_name?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      products: {
        Row: {
          brand_id: string | null;
          category: string | null;
          created_at: string;
          created_by: string | null;
          description: string | null;
          id: string;
          is_active: boolean;
          minimum_stock_quantity: number;
          name: string;
          sku: string | null;
          sub_category: string | null;
          uom: string | null;
          updated_at: string;
        };
        Insert: {
          brand_id?: string | null;
          category?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          minimum_stock_quantity?: number;
          name: string;
          sku?: string | null;
          sub_category?: string | null;
          uom?: string | null;
          updated_at?: string;
        };
        Update: {
          brand_id?: string | null;
          category?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          minimum_stock_quantity?: number;
          name?: string;
          sku?: string | null;
          sub_category?: string | null;
          uom?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey";
            columns: ["brand_id"];
            isOneToOne: false;
            referencedRelation: "brands";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "products_category_fkey";
            columns: ["category"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "products_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "products_sub_category_fkey";
            columns: ["sub_category"];
            isOneToOne: false;
            referencedRelation: "subcategories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "products_uom_fkey";
            columns: ["uom"];
            isOneToOne: false;
            referencedRelation: "units_of_measure";
            referencedColumns: ["id"];
          },
        ];
      };
      profile_shop_types: {
        Row: {
          access_level: Database["public"]["Enums"]["access_level"];
          created_at: string;
          id: string;
          profile_id: string;
          shop_type_id: string;
          updated_at: string;
        };
        Insert: {
          access_level?: Database["public"]["Enums"]["access_level"];
          created_at?: string;
          id?: string;
          profile_id: string;
          shop_type_id: string;
          updated_at?: string;
        };
        Update: {
          access_level?: Database["public"]["Enums"]["access_level"];
          created_at?: string;
          id?: string;
          profile_id?: string;
          shop_type_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profile_shop_types_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "profile_shop_types_shop_type_id_fkey";
            columns: ["shop_type_id"];
            isOneToOne: false;
            referencedRelation: "shop_types";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          email: string;
          full_name: string | null;
          id: string;
          perm_add_products: boolean;
          perm_do_adjustment: boolean;
          perm_do_purchase: boolean;
          perm_do_return: boolean;
          perm_do_sale: boolean;
          perm_do_transfer: boolean;
          perm_stock_own_shop: boolean;
          perm_stock_read_all: boolean;
          role: Database["public"]["Enums"]["app_role"];
          status: Database["public"]["Enums"]["account_status"];
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          email: string;
          full_name?: string | null;
          id: string;
          perm_add_products?: boolean;
          perm_do_adjustment?: boolean;
          perm_do_purchase?: boolean;
          perm_do_return?: boolean;
          perm_do_sale?: boolean;
          perm_do_transfer?: boolean;
          perm_stock_own_shop?: boolean;
          perm_stock_read_all?: boolean;
          role?: Database["public"]["Enums"]["app_role"];
          status?: Database["public"]["Enums"]["account_status"];
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string;
          full_name?: string | null;
          id?: string;
          perm_add_products?: boolean;
          perm_do_adjustment?: boolean;
          perm_do_purchase?: boolean;
          perm_do_return?: boolean;
          perm_do_sale?: boolean;
          perm_do_transfer?: boolean;
          perm_stock_own_shop?: boolean;
          perm_stock_read_all?: boolean;
          role?: Database["public"]["Enums"]["app_role"];
          status?: Database["public"]["Enums"]["account_status"];
          updated_at?: string;
        };
        Relationships: [];
      };
      role_permissions: {
        Row: {
          id: number;
          permission: Database["public"]["Enums"]["app_permission"];
          role: Database["public"]["Enums"]["app_role"];
        };
        Insert: {
          id?: number;
          permission: Database["public"]["Enums"]["app_permission"];
          role: Database["public"]["Enums"]["app_role"];
        };
        Update: {
          id?: number;
          permission?: Database["public"]["Enums"]["app_permission"];
          role?: Database["public"]["Enums"]["app_role"];
        };
        Relationships: [];
      };
      shop_types: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          is_active: boolean;
          name: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          name: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      stock: {
        Row: {
          id: string;
          product_id: string;
          quantity: number;
          shop_type_id: string;
          updated_at: string;
          warehouse_id: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          quantity?: number;
          shop_type_id: string;
          updated_at?: string;
          warehouse_id: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          quantity?: number;
          shop_type_id?: string;
          updated_at?: string;
          warehouse_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "stock_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_shop_type_id_fkey";
            columns: ["shop_type_id"];
            isOneToOne: false;
            referencedRelation: "shop_types";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "warehouses";
            referencedColumns: ["id"];
          },
        ];
      };
      stock_adjustments: {
        Row: {
          adjusted_at: string;
          adjusted_by: string | null;
          id: string;
          notes: string | null;
          product_id: string;
          quantity_delta: number;
          shop_type_id: string;
          status: Database["public"]["Enums"]["transaction_status"];
          warehouse_id: string;
        };
        Insert: {
          adjusted_at?: string;
          adjusted_by?: string | null;
          id?: string;
          notes?: string | null;
          product_id: string;
          quantity_delta: number;
          shop_type_id: string;
          status?: Database["public"]["Enums"]["transaction_status"];
          warehouse_id: string;
        };
        Update: {
          adjusted_at?: string;
          adjusted_by?: string | null;
          id?: string;
          notes?: string | null;
          product_id?: string;
          quantity_delta?: number;
          shop_type_id?: string;
          status?: Database["public"]["Enums"]["transaction_status"];
          warehouse_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "stock_adjustments_adjusted_by_fkey";
            columns: ["adjusted_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_adjustments_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_adjustments_shop_type_id_fkey";
            columns: ["shop_type_id"];
            isOneToOne: false;
            referencedRelation: "shop_types";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_adjustments_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "warehouses";
            referencedColumns: ["id"];
          },
        ];
      };
      stock_movements: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          new_quantity: number | null;
          notes: string | null;
          previous_quantity: number | null;
          product_id: string;
          quantity_delta: number;
          reference_id: string | null;
          shop_type_id: string;
          type: Database["public"]["Enums"]["movement_type"];
          warehouse_id: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          new_quantity?: number | null;
          notes?: string | null;
          previous_quantity?: number | null;
          product_id: string;
          quantity_delta: number;
          reference_id?: string | null;
          shop_type_id: string;
          type: Database["public"]["Enums"]["movement_type"];
          warehouse_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          new_quantity?: number | null;
          notes?: string | null;
          previous_quantity?: number | null;
          product_id?: string;
          quantity_delta?: number;
          reference_id?: string | null;
          shop_type_id?: string;
          type?: Database["public"]["Enums"]["movement_type"];
          warehouse_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "stock_movements_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_movements_shop_type_id_fkey";
            columns: ["shop_type_id"];
            isOneToOne: false;
            referencedRelation: "shop_types";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_movements_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "warehouses";
            referencedColumns: ["id"];
          },
        ];
      };
      stock_transfers: {
        Row: {
          dest_warehouse_id: string;
          id: string;
          notes: string | null;
          product_id: string;
          quantity: number;
          shop_type_id: string;
          source_warehouse_id: string;
          status: Database["public"]["Enums"]["transaction_status"];
          transferred_at: string;
          transferred_by: string | null;
        };
        Insert: {
          dest_warehouse_id: string;
          id?: string;
          notes?: string | null;
          product_id: string;
          quantity: number;
          shop_type_id: string;
          source_warehouse_id: string;
          status?: Database["public"]["Enums"]["transaction_status"];
          transferred_at?: string;
          transferred_by?: string | null;
        };
        Update: {
          dest_warehouse_id?: string;
          id?: string;
          notes?: string | null;
          product_id?: string;
          quantity?: number;
          shop_type_id?: string;
          source_warehouse_id?: string;
          status?: Database["public"]["Enums"]["transaction_status"];
          transferred_at?: string;
          transferred_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "stock_transfers_dest_warehouse_id_fkey";
            columns: ["dest_warehouse_id"];
            isOneToOne: false;
            referencedRelation: "warehouses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_transfers_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_transfers_shop_type_id_fkey";
            columns: ["shop_type_id"];
            isOneToOne: false;
            referencedRelation: "shop_types";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_transfers_source_warehouse_id_fkey";
            columns: ["source_warehouse_id"];
            isOneToOne: false;
            referencedRelation: "warehouses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_transfers_transferred_by_fkey";
            columns: ["transferred_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      subcategories: {
        Row: {
          category_id: string;
          created_at: string;
          description: string | null;
          id: string;
          subcategory_name: string;
          updated_at: string;
        };
        Insert: {
          category_id: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          subcategory_name: string;
          updated_at?: string;
        };
        Update: {
          category_id?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          subcategory_name?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subcategories_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      units_of_measure: {
        Row: {
          created_at: string;
          example: string | null;
          full_name: string;
          id: string;
          uom_code: string;
        };
        Insert: {
          created_at?: string;
          example?: string | null;
          full_name: string;
          id?: string;
          uom_code: string;
        };
        Update: {
          created_at?: string;
          example?: string | null;
          full_name?: string;
          id?: string;
          uom_code?: string;
        };
        Relationships: [];
      };
      warehouses: {
        Row: {
          created_at: string;
          created_by: string | null;
          description: string | null;
          id: string;
          is_active: boolean;
          location: string | null;
          name: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          location?: string | null;
          name: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          location?: string | null;
          name?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "warehouses_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      adjust_stock: {
        Args: {
          p_adjusted_by?: string;
          p_delta: number;
          p_notes?: string;
          p_product_id: string;
          p_reason?: string;
          p_shop_type_id: string;
          p_warehouse_id: string;
        };
        Returns: undefined;
      };
      approve_transaction: {
        Args: { p_admin_id?: string; p_id: string; p_table: string };
        Returns: undefined;
      };
      authorize: {
        Args: {
          requested_permission: Database["public"]["Enums"]["app_permission"];
        };
        Returns: boolean;
      };
      custom_access_token_hook: { Args: { event: Json }; Returns: Json };
      get_my_role: {
        Args: never;
        Returns: Database["public"]["Enums"]["app_role"];
      };
      show_limit: { Args: never; Returns: number };
      show_trgm: { Args: { "": string }; Returns: string[] };
      transfer_stock: {
        Args: {
          p_dest_warehouse_id: string;
          p_notes?: string;
          p_product_id: string;
          p_quantity: number;
          p_reason?: string;
          p_shop_type_id: string;
          p_source_warehouse_id: string;
          p_transferred_by?: string;
        };
        Returns: undefined;
      };
    };
    Enums: {
      access_level: "read_only" | "write";
      account_status: "pending" | "active" | "inactive" | "rejected";
      app_permission:
        | "products.create"
        | "products.edit"
        | "products.delete"
        | "warehouses.manage"
        | "shops.manage"
        | "stock.read_all"
        | "stock.read_own_shop"
        | "users.manage";
      app_role: "admin" | "manager" | "user";
      movement_type:
        | "adjustment"
        | "in"
        | "transfer_in"
        | "transfer_out"
        | "out"
        | "return"
        | "initial_stock";
      transaction_status: "pending" | "approved" | "rejected";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      access_level: ["read_only", "write"],
      account_status: ["pending", "active", "inactive", "rejected"],
      app_permission: [
        "products.create",
        "products.edit",
        "products.delete",
        "warehouses.manage",
        "shops.manage",
        "stock.read_all",
        "stock.read_own_shop",
        "users.manage",
      ],
      app_role: ["admin", "manager", "user"],
      movement_type: [
        "adjustment",
        "in",
        "transfer_in",
        "transfer_out",
        "out",
        "return",
        "initial_stock",
      ],
      transaction_status: ["pending", "approved", "rejected"],
    },
  },
} as const;
