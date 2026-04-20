import React, { useState, useEffect } from 'react';
import { User, Camera, Globe, Mail, LogIn, CheckCircle, Shield, Languages, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';
import { t } from '../utils/i18n';
import { useAuth } from '../contexts/AuthContext';

export const ProfileTab = () => {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState({
    name: user?.name || localStorage.getItem('guru_user_name') || 'Usuário Guru',
    bio: localStorage.getItem('guru_user_bio') || 'Criador de conteúdo apaixonado por IA.',
    avatar: user?.picture || localStorage.getItem('guru_user_avatar') || null,
    language: localStorage.getItem('guru_app_lang') || 'Português (BR)',
    googleConnected: !!user
  });

  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    localStorage.setItem('guru_user_name', profile.name);
    localStorage.setItem('guru_user_bio', profile.bio);
    if (profile.avatar) localStorage.setItem('guru_user_avatar', profile.avatar);
    localStorage.setItem('guru_app_lang', profile.language);
    localStorage.setItem('guru_google_connected', profile.googleConnected);
  }, [profile]);

  const handleLanguageChange = (lang) => {
    setProfile(prev => ({ ...prev, language: lang }));
    localStorage.setItem('guru_app_lang', lang);
    window.dispatchEvent(new Event('guru_language_change'));
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfile(prev => ({ ...prev, avatar: reader.result }));
        localStorage.setItem('guru_user_avatar', reader.result);
        window.dispatchEvent(new Event('guru_profile_change'));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    setIsSaved(true);
    window.dispatchEvent(new Event('guru_profile_change'));
    setTimeout(() => setIsSaved(false), 2000);
  };

  const toggleGoogle = () => {
    if (user) {
      logout();
    } else {
      // In a real app, this would trigger the login flow
      // For now, we redirect to login (which is handled by App.jsx)
      window.location.reload(); 
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-full flex flex-col overflow-y-auto custom-scrollbar pb-20">
      <header className="mb-8 shrink-0">
        <h2 className="text-2xl md:text-4xl font-bold text-gray-200 flex items-center gap-3">
          <User className="text-neon-cyan w-8 h-8 md:w-10 md:h-10" />
          {t('profile.title')}
        </h2>
        <p className="text-sm md:text-base text-gray-400 mt-2">{t('profile.subtitle')}</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Avatar & Basic Info */}
        <div className="md:col-span-1 space-y-6">
          <div className="glass-card p-6 flex flex-col items-center text-center relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-neon-cyan to-neon-purple" />
            
            <div className="relative mb-4 group">
              <div className="w-32 h-32 rounded-full border-4 border-neon-cyan/20 overflow-hidden bg-dark/50 flex items-center justify-center">
                {profile.avatar ? (
                  <img src={profile.avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-16 h-16 text-gray-600" />
                )}
              </div>
              <label 
                htmlFor="avatar-upload" 
                className="absolute bottom-0 right-0 p-2 bg-neon-cyan text-dark rounded-full cursor-pointer hover:scale-110 transition-transform shadow-[0_0_10px_rgba(0,243,255,0.5)]"
              >
                <Camera className="w-4 h-4" />
                <input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </label>
            </div>

            <h3 className="text-xl font-bold text-white mb-1">{profile.name}</h3>
            <p className="text-xs text-gray-500 font-mono uppercase tracking-widest">{profile.googleConnected ? t('profile.connected') : t('profile.local_user')}</p>
          </div>

          <div className="glass-card p-6 border border-neon-cyan/20">
             <div className="flex items-center gap-3 mb-4">
                <Shield className="text-neon-cyan w-5 h-5" />
                <h4 className="text-white font-bold text-sm">{t('profile.access_level')}</h4>
             </div>
             <p className="text-xs text-gray-400 mb-4" dangerouslySetInnerHTML={{ __html: t('profile.plan_description') }} />
             <div className="w-full bg-dark bg-opacity-50 rounded-full h-1.5 overflow-hidden">
                <div className="bg-neon-cyan h-full w-[85%] shadow-[0_0_10px_#00f3ff]" />
             </div>
          </div>
        </div>

        {/* Settings Form */}
        <div className="md:col-span-2 space-y-6">
          <div className="glass-card p-6 space-y-4">
            <div className="flex items-center gap-2 mb-4 border-b border-white/10 pb-2">
              <Globe className="text-neon-cyan w-5 h-5" />
              <h3 className="text-lg font-bold text-white">{t('profile.account_info')}</h3>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider block mb-1">{t('profile.full_name')}</label>
                <input 
                  type="text" 
                  value={profile.name}
                  onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-dark/50 border border-white/10 rounded-lg p-2.5 text-gray-200 focus:outline-none focus:border-neon-cyan/50 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider block mb-1">{t('profile.bio')}</label>
                <textarea 
                  value={profile.bio}
                  rows={3}
                  onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
                  className="w-full bg-dark/50 border border-white/10 rounded-lg p-2.5 text-gray-200 focus:outline-none focus:border-neon-cyan/50 text-sm resize-none"
                />
              </div>
            </div>
          </div>

          <div className="glass-card p-6 space-y-4">
             <div className="flex items-center gap-2 mb-4 border-b border-white/10 pb-2">
                <Languages className="text-neon-purple w-5 h-5" />
                <h3 className="text-lg font-bold text-white">{t('profile.global_prefs')}</h3>
             </div>

             <div>
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider block mb-2">{t('profile.app_lang')}</label>
                <div className="grid grid-cols-3 gap-3">
                   {['Português (BR)', 'English', 'Español'].map(lang => (
                     <button
                       key={lang}
                       onClick={() => setProfile(prev => ({ ...prev, language: lang }))}
                       className={`py-2.5 text-xs font-medium rounded-lg border transition-all ${
                         profile.language === lang 
                           ? 'bg-neon-purple/20 border-neon-purple text-neon-purple shadow-[0_0_10px_rgba(157,0,255,0.2)]'
                           : 'bg-dark/50 border-white/10 text-gray-400 hover:border-white/30'
                       }`}
                     >
                       {lang}
                     </button>
                   ))}
                </div>
             </div>
          </div>

          <div className="glass-card p-6 border-l-4 border-l-neon-cyan">
             <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                   <div className="p-2 bg-blue-500/10 rounded-lg">
                      {user ? <LogOut className="w-5 h-5 text-red-400" /> : <LogIn className="w-5 h-5 text-blue-400" />}
                   </div>
                   <div>
                      <h3 className="text-white font-bold text-sm">{user ? 'Google Cloud Sync Active' : 'Google Cloud Sync'}</h3>
                      <p className="text-[10px] text-gray-500">{user ? `Conectado como ${user.email}` : 'Salve seus projetos na nuvem automaticamente.'}</p>
                   </div>
                </div>
                <button 
                  onClick={toggleGoogle}
                  className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${
                    user 
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30' 
                      : 'bg-dark border border-white/10 text-gray-400 hover:bg-white/5'
                  }`}
                >
                  {user ? 'Sair' : t('profile.connect')}
                </button>
             </div>
          </div>

          <button 
            onClick={handleSave}
            className="w-full py-3 flex justify-center items-center gap-2 bg-neon-cyan/20 hover:bg-neon-cyan/30 border border-neon-cyan/50 rounded-xl text-neon-cyan font-bold transition-all shadow-[0_0_20px_rgba(0,243,255,0.1)]"
          >
            {isSaved ? <><CheckCircle className="w-5 h-5" /> {t('profile.saved_success')}</> : t('profile.save_changes')}
          </button>
        </div>
      </div>
    </div>
  );
};
