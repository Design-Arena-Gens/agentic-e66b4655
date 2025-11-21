import dynamic from 'next/dynamic';

const ClayLakeCanvas = dynamic(() => import('../components/ClayLakeCanvas'), { ssr: false });

export default function Page() {
  return (
    <main className="aspect-9-16">
      <ClayLakeCanvas />
      <div className="small-note">Claymation-style canvas animation ? 9:16</div>
    </main>
  );
}
