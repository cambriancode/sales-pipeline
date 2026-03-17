'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function createProduct(formData: FormData): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect('/login');
  }

  const name = formData.get('name')?.toString().trim() || '';
  const sku = formData.get('sku')?.toString().trim() || null;
  const category = formData.get('category')?.toString().trim() || null;
  const description = formData.get('description')?.toString().trim() || null;
  const unitOfMeasure =
    formData.get('unit_of_measure')?.toString().trim() || null;

  const basePriceRaw = formData.get('base_price')?.toString().trim() || '';
  const basePrice =
    basePriceRaw === '' ? null : Number(basePriceRaw);

  if (!name) {
    redirect('/admin/catalog?error=missing-name');
  }

  if (basePriceRaw !== '' && !Number.isFinite(basePrice)) {
    redirect('/admin/catalog?error=invalid-base-price');
  }

  const { error } = await supabase.from('products').insert({
    name,
    sku,
    category,
    description,
    unit_of_measure: unitOfMeasure,
    base_price: basePrice,
    is_active: true,
  });

  if (error) {
    redirect(`/admin/catalog?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath('/admin/catalog');
  redirect('/admin/catalog?success=1');
}