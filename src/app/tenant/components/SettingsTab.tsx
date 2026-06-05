'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  User, Phone, MapPin, Calendar, Shield, Upload,
  CheckCircle2, Loader2, Camera, FileText, Eye, EyeOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

// ────────────────────────────────────────────────────────────────────────────
// Types
//
// Extended profile is stored in a separate `tenant_profiles` table:
//   CREATE TABLE tenant_profiles (
//     tenant_id        UUID PRIMARY KEY REFERENCES tenants(id),
//     date_of_birth    DATE,
//     permanent_address TEXT,
//     emergency_name   TEXT,
//     emergency_phone  TEXT,
//     emergency_rel    TEXT,
//     avatar_url       TEXT,  -- Supabase Storage: 'profile-pictures' bucket
//     id_doc_url       TEXT,  -- Supabase Storage: 'tenant-documents' bucket
//     updated_at       TIMESTAMPTZ DEFAULT NOW()
//   );
// ────────────────────────────────────────────────────────────────────────────

interface ExtendedProfile {
  date_of_birth:     string;
  permanent_address: string;
  emergency_name:    string;
  emergency_phone:   string;
  emergency_rel:     string;
  avatar_url:        string;
  id_doc_url:        string;
}

interface TenantBasic {
  name:  string;
  email: string;
  phone: string;
}

interface Props {
  tenantId: string;
  initialName?: string;
  initialEmail?: string;
}

// ────────────────────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────────────────────

export function SettingsTab({ tenantId, initialName = '', initialEmail = '' }: Props) {
  const [basic, setBasic] = useState<TenantBasic>({ name: initialName, email: initialEmail, phone: '' });
  const [ext,   setExt]   = useState<ExtendedProfile>({
    date_of_birth: '', permanent_address: '', emergency_name: '', emergency_phone: '', emergency_rel: '', avatar_url: '', id_doc_url: '',
  });
  const [loading,       setLoading]       = useState(true);
  const [savingBasic,   setSavingBasic]   = useState(false);
  const [savingExt,     setSavingExt]     = useState(false);
  const [savedBasic,    setSavedBasic]    = useState(false);
  const [savedExt,      setSavedExt]      = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingDoc,    setUploadingDoc]    = useState(false);
  const [showPhone,       setShowPhone]       = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const docInputRef    = useRef<HTMLInputElement>(null);

  // ── Load ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    (async () => {
      const [tenantRes, profileRes] = await Promise.all([
        // SELECT name, email, phone FROM tenants WHERE id = ?
        supabase.from('tenants').select('name, email').eq('id', tenantId).single(),
        // SELECT * FROM tenant_profiles WHERE tenant_id = ?
        supabase.from('tenant_profiles').select('*').eq('tenant_id', tenantId).single(),
      ]);

      if (tenantRes.data) {
        setBasic(b => ({ ...b, name: tenantRes.data.name ?? b.name, email: tenantRes.data.email ?? b.email }));
      }
      if (profileRes.data) {
        setExt({
          date_of_birth:     profileRes.data.date_of_birth     ?? '',
          permanent_address: profileRes.data.permanent_address ?? '',
          emergency_name:    profileRes.data.emergency_name    ?? '',
          emergency_phone:   profileRes.data.emergency_phone   ?? '',
          emergency_rel:     profileRes.data.emergency_rel     ?? '',
          avatar_url:        profileRes.data.avatar_url        ?? '',
          id_doc_url:        profileRes.data.id_doc_url        ?? '',
        });
      }
      setLoading(false);
    })();
  }, [tenantId, initialName, initialEmail]);

  // ── Save basic ───────────────────────────────────────────────────────────

  const saveBasic = async () => {
    setSavingBasic(true);
    // UPDATE tenants SET name = ? WHERE id = ?
    await supabase.from('tenants').update({ name: basic.name.trim() }).eq('id', tenantId);
    setSavingBasic(false);
    setSavedBasic(true);
    setTimeout(() => setSavedBasic(false), 2500);
  };

  // ── Save extended profile ────────────────────────────────────────────────

  const saveExt = async () => {
    setSavingExt(true);
    // UPSERT INTO tenant_profiles SET * WHERE tenant_id = ?
    await supabase.from('tenant_profiles').upsert(
      { tenant_id: tenantId, ...ext, updated_at: new Date().toISOString() },
      { onConflict: 'tenant_id' }
    );
    setSavingExt(false);
    setSavedExt(true);
    setTimeout(() => setSavedExt(false), 2500);
  };

  // ── Avatar upload ────────────────────────────────────────────────────────

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);

    // Upload to Supabase Storage — bucket: 'profile-pictures', path: '{tenantId}/avatar.jpg'
    const { error } = await supabase.storage
      .from('profile-pictures')
      .upload(`${tenantId}/avatar.jpg`, file, { upsert: true, contentType: file.type });

    if (!error) {
      const { data: { publicUrl } } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(`${tenantId}/avatar.jpg`);

      // Bust cache by appending timestamp
      const busted = `${publicUrl}?t=${Date.now()}`;
      setExt(prev => ({ ...prev, avatar_url: busted }));
      // Persist URL in tenant_profiles
      await supabase.from('tenant_profiles').upsert(
        { tenant_id: tenantId, avatar_url: publicUrl, updated_at: new Date().toISOString() },
        { onConflict: 'tenant_id' }
      );
    }
    setUploadingAvatar(false);
  };

  // ── Identity doc upload ──────────────────────────────────────────────────

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingDoc(true);

    // Upload to Supabase Storage — bucket: 'tenant-documents', path: '{tenantId}/identity/{filename}'
    const path = `${tenantId}/identity/${file.name}`;
    const { error } = await supabase.storage
      .from('tenant-documents')
      .upload(path, file, { upsert: true, contentType: file.type });

    if (!error) {
      const { data: { publicUrl } } = supabase.storage
        .from('tenant-documents')
        .getPublicUrl(path);
      setExt(prev => ({ ...prev, id_doc_url: publicUrl }));
      await supabase.from('tenant_profiles').upsert(
        { tenant_id: tenantId, id_doc_url: publicUrl, updated_at: new Date().toISOString() },
        { onConflict: 'tenant_id' }
      );
    }
    setUploadingDoc(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-5 h-5 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">

      {/* ── Profile Picture ──────────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="soft-card border border-white bg-white/40 p-7 space-y-5"
      >
        <SectionHeader icon={Camera} title="Profile Picture" />

        <div className="flex items-center gap-6">
          <div className="relative shrink-0">
            <div className="w-20 h-20 rounded-2xl soft-well border border-white overflow-hidden">
              {ext.avatar_url ? (
                <img src={ext.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-primary/10">
                  <User className="w-8 h-8 text-primary/50" />
                </div>
              )}
            </div>
            {uploadingAvatar && (
              <div className="absolute inset-0 rounded-2xl flex items-center justify-center bg-background/80">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-[11px] font-bold text-foreground/40">JPG, PNG or WEBP · Max 5 MB</p>
            <button
              onClick={() => avatarInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="soft-button border border-white px-4 py-2.5 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-widest text-foreground/60 hover:text-foreground transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              {uploadingAvatar ? 'Uploading…' : 'Upload Photo'}
            </button>
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          </div>
        </div>
      </motion.section>

      {/* ── Basic Info ───────────────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.07 }}
        className="soft-card border border-white bg-white/40 p-7 space-y-5"
      >
        <SectionHeader icon={User} title="Basic Info" />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label="Full Name"
            value={basic.name}
            onChange={v => setBasic(b => ({ ...b, name: v }))}
            placeholder="Your full name"
          />
          <Field
            label="Email"
            value={basic.email}
            onChange={v => setBasic(b => ({ ...b, email: v }))}
            placeholder="you@email.com"
            disabled
          />
        </div>

        <SaveButton
          onClick={saveBasic}
          loading={savingBasic}
          saved={savedBasic}
        />
      </motion.section>

      {/* ── Extended Profile ─────────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}
        className="soft-card border border-white bg-white/40 p-7 space-y-5"
      >
        <SectionHeader icon={Calendar} title="Personal Details" />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label="Date of Birth"
            type="date"
            value={ext.date_of_birth}
            onChange={v => setExt(e => ({ ...e, date_of_birth: v }))}
          />
          <div className="sm:col-span-2">
            <Field
              label="Permanent Address"
              value={ext.permanent_address}
              onChange={v => setExt(e => ({ ...e, permanent_address: v }))}
              placeholder="House No., Street, City, State, PIN"
              multiline
            />
          </div>
        </div>

        <div className="border-t border-white/60 pt-5 space-y-4">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/40 flex items-center gap-2">
            <Phone className="w-3 h-3" /> Emergency Contact
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field
              label="Name"
              value={ext.emergency_name}
              onChange={v => setExt(e => ({ ...e, emergency_name: v }))}
              placeholder="Contact name"
            />
            <div className="relative">
              <Field
                label="Phone"
                value={showPhone ? ext.emergency_phone : ext.emergency_phone.replace(/\d(?=\d{4})/g, '•')}
                onChange={v => setExt(e => ({ ...e, emergency_phone: v }))}
                placeholder="+91 98765 43210"
              />
              <button
                onClick={() => setShowPhone(s => !s)}
                className="absolute right-3 bottom-3 text-foreground/30 hover:text-foreground/60 transition-colors"
              >
                {showPhone ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <Field
              label="Relationship"
              value={ext.emergency_rel}
              onChange={v => setExt(e => ({ ...e, emergency_rel: v }))}
              placeholder="e.g., Parent, Sibling"
            />
          </div>
        </div>

        <SaveButton
          onClick={saveExt}
          loading={savingExt}
          saved={savedExt}
        />
      </motion.section>

      {/* ── Identity Documents ───────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.21 }}
        className="soft-card border border-white bg-white/40 p-7 space-y-5"
      >
        <SectionHeader icon={Shield} title="Identity Documents" />

        <p className="text-[11px] text-foreground/40 font-bold leading-relaxed">
          Upload a government-issued ID (Aadhaar, Passport, PAN Card, or Driving License).
          Files are stored in Supabase Storage bucket <code className="bg-foreground/5 px-1 py-0.5 rounded text-[10px]">tenant-documents/{'{'}tenantId{'}'}/identity/</code>
        </p>

        {ext.id_doc_url ? (
          <div className="flex items-center gap-4 px-4 py-3 rounded-2xl bg-emerald-50 border border-emerald-200/60">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-extrabold text-emerald-700 uppercase tracking-wide">Document on file</p>
              <a href={ext.id_doc_url} target="_blank" rel="noopener noreferrer"
                className="text-[10px] text-emerald-600 underline font-bold truncate block">
                View document
              </a>
            </div>
          </div>
        ) : (
          <div className="px-4 py-3 rounded-2xl bg-amber-50 border border-amber-200/60">
            <p className="text-[11px] text-amber-700 font-bold">No identity document on file — please upload one.</p>
          </div>
        )}

        <div className="flex items-center gap-4">
          <button
            onClick={() => docInputRef.current?.click()}
            disabled={uploadingDoc}
            className="soft-button border border-white px-5 py-3 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-widest text-foreground/60 hover:text-foreground transition-colors"
          >
            {uploadingDoc
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading…</>
              : <><FileText className="w-3.5 h-3.5" /> {ext.id_doc_url ? 'Replace Document' : 'Upload Document'}</>}
          </button>
          <input ref={docInputRef} type="file" accept=".pdf,image/*" className="hidden" onChange={handleDocUpload} />
          <p className="text-[10px] text-foreground/25 font-bold">PDF, JPG or PNG · Max 10 MB</p>
        </div>
      </motion.section>

    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <h3 className="text-base font-black tracking-tighter uppercase flex items-center gap-2.5">
      <span className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
        <Icon className="w-3.5 h-3.5" />
      </span>
      {title}
    </h3>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
  multiline?: boolean;
}

function Field({ label, value, onChange, placeholder, type = 'text', disabled, multiline }: FieldProps) {
  const base = cn(
    'w-full soft-well border border-white px-4 py-3 text-sm font-medium text-foreground placeholder:text-foreground/20 outline-none rounded-2xl transition-colors',
    disabled ? 'opacity-50 cursor-not-allowed' : 'focus:border-primary/40'
  );
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-extrabold uppercase tracking-widest text-foreground/40">{label}</label>
      {multiline ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          rows={3}
          className={cn(base, 'resize-none')}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={base}
        />
      )}
    </div>
  );
}

interface SaveButtonProps {
  onClick: () => void;
  loading: boolean;
  saved: boolean;
}

function SaveButton({ onClick, loading, saved }: SaveButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={cn(
        'px-6 py-3 rounded-xl text-[11px] font-extrabold uppercase tracking-widest flex items-center gap-2 transition-all',
        saved  ? 'bg-emerald-500 text-white shadow-md' :
        loading ? 'bg-foreground/10 text-foreground/30 cursor-not-allowed' :
                  'btn-terracotta shadow-md shadow-primary/20'
      )}
    >
      {loading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</>
       : saved  ? <><CheckCircle2 className="w-3.5 h-3.5" /> Saved!</>
       :           'Save Changes'}
    </button>
  );
}
