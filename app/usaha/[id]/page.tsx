import { redirect } from 'next/navigation';
type Props = { params: Promise<{ id: string }> };
export default async function BusinessDetail({ params }: Props) { await params; redirect('/produk'); }
