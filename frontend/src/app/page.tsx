/**
 * Homepage pública — Redirige a catálogo o sign-in
 */
import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';

export default async function HomePage() {
  const { userId } = await auth();

  if (userId) {
    redirect('/catalog');
  } else {
    redirect('/sign-in');
  }
}
