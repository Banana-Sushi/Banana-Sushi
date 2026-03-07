'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { Icons } from '@/components/Icons';

const DEFAULTS: Record<string, string> = {
  hero_title: 'FRISCHES SUSHI.',
  hero_subtitle_de: 'Banana Sushi kombiniert traditionelle Handwerkskunst mit modernem Flair. Exklusiv als Lieferservice.',
  hero_subtitle_en: 'Banana Sushi combines traditional craftsmanship with modern flair. Delivery exclusive.',
  hero_image: 'https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&q=80&w=1600',
  about_heading: 'Passion on a plate.',
  about_text_de: '„Qualität, die man schmeckt. Leidenschaft, die man sieht. Sushi, das man liebt. BANANA Sushi steht für kreative Fusionen und absolute Frische."',
  about_text_en: '"Quality you can taste. Passion you can see. Sushi you will love. BANANA Sushi stands for creative fusions and absolute freshness."',
  about_image: 'https://images.unsplash.com/photo-1617196034183-421b4040ed20?auto=format&fit=crop&q=80&w=1200',
  gallery_subtitle: 'Art on a plate',
  gallery_1: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?auto=format&fit=crop&q=80&w=800',
  gallery_2: 'https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&q=80&w=800',
  gallery_3: 'https://images.unsplash.com/photo-1583623025817-d180a2221d0a?auto=format&fit=crop&q=80&w=800',
  gallery_4: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=800',
  contact_address: 'Sushi-Allee 42, 10115 Berlin',
  contact_hours: 'Daily 12:00 – 22:00',
  contact_phone: '+49 (0) 30 123 456 78',
};

function ImageField({
  label,
  fieldKey,
  value,
  onChange,
}: {
  label: string;
  fieldKey: string;
  value: string;
  onChange: (key: string, val: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { addToast } = useAppContext();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/content/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      onChange(fieldKey, data.url);
    } catch (err: any) {
      addToast(err.message || 'Upload failed', 'error');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div>
      <label className="text-[9px] font-black uppercase text-gray-400 ml-1">{label}</label>
      <div className="mt-1 space-y-2">
        {value && (
          <div className="relative w-full h-32 rounded-2xl overflow-hidden bg-gray-100">
            <Image src={value} alt="Preview" fill className="object-cover" sizes="600px" unoptimized />
          </div>
        )}
        <input
          value={value}
          onChange={e => onChange(fieldKey, e.target.value)}
          placeholder="Paste image URL (https://...)"
          className="w-full p-4 bg-gray-50 rounded-2xl border-none outline-none font-bold text-sm"
        />
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-100" />
          <span className="text-[9px] font-black uppercase text-gray-300 tracking-widest">or upload</span>
          <div className="flex-1 h-px bg-gray-100" />
        </div>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="w-full p-4 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 font-black text-[10px] uppercase tracking-widest text-gray-400 hover:border-black hover:text-black transition-all disabled:opacity-50"
        >
          {uploading ? 'Uploading...' : 'Upload from device'}
        </button>
      </div>
    </div>
  );
}

function TextField({
  label,
  fieldKey,
  value,
  onChange,
  multiline = false,
}: {
  label: string;
  fieldKey: string;
  value: string;
  onChange: (key: string, val: string) => void;
  multiline?: boolean;
}) {
  return (
    <div>
      <label className="text-[9px] font-black uppercase text-gray-400 ml-1">{label}</label>
      {multiline ? (
        <textarea
          value={value}
          onChange={e => onChange(fieldKey, e.target.value)}
          rows={3}
          className="w-full mt-1 p-4 bg-gray-50 rounded-2xl border-none outline-none font-bold text-sm resize-none"
        />
      ) : (
        <input
          value={value}
          onChange={e => onChange(fieldKey, e.target.value)}
          className="w-full mt-1 p-4 bg-gray-50 rounded-2xl border-none outline-none font-bold text-sm"
        />
      )}
    </div>
  );
}

export default function ContentPage() {
  const { addToast } = useAppContext();
  const [form, setForm] = useState<Record<string, string>>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/content')
      .then(r => r.json())
      .then(data => {
        setForm(prev => ({ ...prev, ...data }));
        setLoading(false);
      });
  }, []);

  const setField = (key: string, val: string) => setForm(prev => ({ ...prev, [key]: val }));

  const saveSection = async (keys: string[], sectionName: string) => {
    setSaving(sectionName);
    try {
      const payload: Record<string, string> = {};
      keys.forEach(k => { payload[k] = form[k]; });
      const res = await fetch('/api/content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to save');
      addToast(`${sectionName} saved`, 'success');
    } catch {
      addToast('Failed to save. Please try again.', 'error');
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="pt-[100px] lg:pl-32 flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isSaving = (name: string) => saving === name;

  return (
    <div className="pt-[100px] px-4 md:px-12 max-w-4xl mx-auto lg:pl-32 min-h-screen pb-32 space-y-12">
      <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter">
        Content<span className="text-yellow-500">.</span>
      </h2>

      {/* Hero Section */}
      <section className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm space-y-5">
        <h3 className="text-sm font-black uppercase tracking-widest border-b border-gray-100 pb-4">Hero Section</h3>
        <TextField label="Title" fieldKey="hero_title" value={form.hero_title} onChange={setField} />
        <TextField label="Subtitle (DE)" fieldKey="hero_subtitle_de" value={form.hero_subtitle_de} onChange={setField} multiline />
        <TextField label="Subtitle (EN)" fieldKey="hero_subtitle_en" value={form.hero_subtitle_en} onChange={setField} multiline />
        <ImageField label="Background Image" fieldKey="hero_image" value={form.hero_image} onChange={setField} />
        <button
          onClick={() => saveSection(['hero_title', 'hero_subtitle_de', 'hero_subtitle_en', 'hero_image'], 'Hero')}
          disabled={isSaving('Hero')}
          className="w-full bg-black text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-yellow-500 hover:text-black transition-all disabled:opacity-50"
        >
          {isSaving('Hero') ? 'Saving...' : 'Save Hero'}
        </button>
      </section>

      {/* About Section */}
      <section className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm space-y-5">
        <h3 className="text-sm font-black uppercase tracking-widest border-b border-gray-100 pb-4">About Section</h3>
        <TextField label="Heading" fieldKey="about_heading" value={form.about_heading} onChange={setField} />
        <TextField label="Text (DE)" fieldKey="about_text_de" value={form.about_text_de} onChange={setField} multiline />
        <TextField label="Text (EN)" fieldKey="about_text_en" value={form.about_text_en} onChange={setField} multiline />
        <ImageField label="Photo" fieldKey="about_image" value={form.about_image} onChange={setField} />
        <button
          onClick={() => saveSection(['about_heading', 'about_text_de', 'about_text_en', 'about_image'], 'About')}
          disabled={isSaving('About')}
          className="w-full bg-black text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-yellow-500 hover:text-black transition-all disabled:opacity-50"
        >
          {isSaving('About') ? 'Saving...' : 'Save About'}
        </button>
      </section>

      {/* Gallery Section */}
      <section className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm space-y-5">
        <h3 className="text-sm font-black uppercase tracking-widest border-b border-gray-100 pb-4">Gallery Section</h3>
        <TextField label="Subtitle" fieldKey="gallery_subtitle" value={form.gallery_subtitle} onChange={setField} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <ImageField label="Photo 1" fieldKey="gallery_1" value={form.gallery_1} onChange={setField} />
          <ImageField label="Photo 2" fieldKey="gallery_2" value={form.gallery_2} onChange={setField} />
          <ImageField label="Photo 3" fieldKey="gallery_3" value={form.gallery_3} onChange={setField} />
          <ImageField label="Photo 4" fieldKey="gallery_4" value={form.gallery_4} onChange={setField} />
        </div>
        <button
          onClick={() => saveSection(['gallery_subtitle', 'gallery_1', 'gallery_2', 'gallery_3', 'gallery_4'], 'Gallery')}
          disabled={isSaving('Gallery')}
          className="w-full bg-black text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-yellow-500 hover:text-black transition-all disabled:opacity-50"
        >
          {isSaving('Gallery') ? 'Saving...' : 'Save Gallery'}
        </button>
      </section>

      {/* Contact Section */}
      <section className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm space-y-5">
        <h3 className="text-sm font-black uppercase tracking-widest border-b border-gray-100 pb-4">Contact Info</h3>
        <TextField label="Address" fieldKey="contact_address" value={form.contact_address} onChange={setField} />
        <TextField label="Opening Hours" fieldKey="contact_hours" value={form.contact_hours} onChange={setField} />
        <TextField label="Phone" fieldKey="contact_phone" value={form.contact_phone} onChange={setField} />
        <button
          onClick={() => saveSection(['contact_address', 'contact_hours', 'contact_phone'], 'Contact')}
          disabled={isSaving('Contact')}
          className="w-full bg-black text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-yellow-500 hover:text-black transition-all disabled:opacity-50"
        >
          {isSaving('Contact') ? 'Saving...' : 'Save Contact'}
        </button>
      </section>
    </div>
  );
}
