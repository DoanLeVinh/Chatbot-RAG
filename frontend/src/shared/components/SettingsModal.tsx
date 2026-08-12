import React, { useState, useEffect } from 'react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [autoCite, setAutoCite] = useState(true);
  const [lawDatabase, setLawDatabase] = useState('2023-2024');
  const [fontSize, setFontSize] = useState('medium');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  // Load settings from backend when modal opens
  useEffect(() => {
    if (isOpen) {
      fetch('/api/settings')
        .then((res) => res.json())
        .then((data) => {
          if (data.autoCite !== undefined) setAutoCite(data.autoCite);
          if (data.lawDatabase) setLawDatabase(data.lawDatabase);
          if (data.fontSize) setFontSize(data.fontSize);
        })
        .catch(() => {
          // Use defaults if backend unavailable
        });
    }
  }, [isOpen]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus('idle');

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoCite, lawDatabase, fontSize }),
      });

      if (res.ok) {
        setSaveStatus('saved');
        setTimeout(() => {
          onClose();
          setSaveStatus('idle');
        }, 800);
      } else {
        setSaveStatus('error');
      }
    } catch {
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#c5c5d3] relative">
        <div className="flex justify-between items-center border-b border-[#c5c5d3] pb-3 mb-4">
          <h3 className="font-bold text-lg text-[#00236f] flex items-center gap-2">
            <span className="material-symbols-outlined text-[#00236f]">settings</span>
            Cài đặt hệ thống LogiChat
          </h3>
          <button
            onClick={onClose}
            className="text-[#444651] hover:text-[#00236f] p-1"
          >
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        </div>

        <div className="space-y-4 text-sm text-[#131b2e]">
          {/* Setting 1: Auto citations */}
          <div className="flex justify-between items-center p-3 bg-[#faf8ff] rounded-xl border border-[#c5c5d3]/60">
            <div>
              <div className="font-bold text-xs">Trích dẫn văn bản pháp luật tự động</div>
              <div className="text-[11px] text-[#444651]">
                Tự động hiển thị các Nghị định/Thông tư liên quan trong phản hồi.
              </div>
            </div>
            <input
              type="checkbox"
              checked={autoCite}
              onChange={(e) => setAutoCite(e.target.checked)}
              className="w-4 h-4 accent-[#00236f] cursor-pointer"
            />
          </div>

          {/* Setting 2: Legal Database Version */}
          <div className="p-3 bg-[#faf8ff] rounded-xl border border-[#c5c5d3]/60">
            <label className="block font-bold text-xs mb-1">Cơ sở dữ liệu biểu thuế Hải quan</label>
            <select
              value={lawDatabase}
              onChange={(e) => setLawDatabase(e.target.value)}
              className="w-full bg-white border border-[#c5c5d3] rounded-lg p-2 text-xs text-[#131b2e]"
            >
              <option value="2023-2024">Cập nhật mới nhất 2023 - 2024 (Đầy đủ AJCEP, VJEPA, EVFTA)</option>
              <option value="2022">Biểu thuế Hải quan 2022</option>
            </select>
          </div>

          {/* Setting 3: Font Size */}
          <div className="p-3 bg-[#faf8ff] rounded-xl border border-[#c5c5d3]/60">
            <label className="block font-bold text-xs mb-1">Kích thước chữ trong đoạn chat</label>
            <div className="flex gap-2">
              {['small', 'medium', 'large'].map((size) => (
                <button
                  key={size}
                  onClick={() => setFontSize(size)}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg capitalize border ${
                    fontSize === size
                      ? 'bg-[#00236f] text-white border-[#00236f]'
                      : 'bg-white text-[#444651] border-[#c5c5d3]'
                  }`}
                >
                  {size === 'small' ? 'Nhỏ' : size === 'medium' ? 'Vừa' : 'Lớn'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-[#c5c5d3] flex justify-between items-center">
          {/* Save status feedback */}
          {saveStatus === 'saved' && (
            <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">check_circle</span>
              Đã lưu thành công!
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="text-xs text-red-600 font-semibold flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">error</span>
              Lỗi lưu cài đặt
            </span>
          )}
          {saveStatus === 'idle' && <span />}

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-[#00236f] text-white font-bold text-xs px-5 py-2.5 rounded-xl hover:bg-[#1e3a8a] transition-all cursor-pointer disabled:opacity-60"
          >
            {isSaving ? (
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                Đang lưu...
              </span>
            ) : (
              'Lưu cài đặt'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
