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
  const [waterRipple, setWaterRipple] = useState(
    localStorage.getItem('waterRippleEnabled') !== 'false'
  );
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

      // Save frontend-only setting
      localStorage.setItem('waterRippleEnabled', waterRipple.toString());
      window.dispatchEvent(new Event('ripple_setting_changed'));

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
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-blue-200 relative">
        <div className="flex justify-between items-center border-b border-blue-200 pb-3 mb-4">
          <h3 className="font-bold text-lg text-blue-600 flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-600">settings</span>
            Cài đặt hệ thống LogiChat
          </h3>
          <button
            onClick={onClose}
            className="text-slate-600 hover:text-blue-600 p-1"
          >
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        </div>

        <div className="space-y-4 text-sm text-slate-900">
          {/* Setting 1: Auto citations */}
          <div className="flex justify-between items-center p-3 bg-blue-50 rounded-xl border border-blue-200/60">
            <div>
              <label htmlFor="autoCiteCheckbox" className="font-bold text-xs cursor-pointer">Trích dẫn văn bản pháp luật tự động</label>
              <div className="text-[11px] text-slate-600">
                Tự động hiển thị các Nghị định/Thông tư liên quan trong phản hồi.
              </div>
            </div>
            <input
              id="autoCiteCheckbox"
              name="autoCite"
              type="checkbox"
              checked={autoCite}
              onChange={(e) => setAutoCite(e.target.checked)}
              className="w-4 h-4 accent-blue-600 cursor-pointer"
            />
          </div>

          {/* Setting: Water Ripple Mouse Effect */}
          <div className="flex justify-between items-center p-3 bg-blue-50 rounded-xl border border-blue-200/60">
            <div>
              <label htmlFor="waterRippleCheckbox" className="font-bold text-xs cursor-pointer">Hiệu ứng gợn sóng con trỏ chuột</label>
              <div className="text-[11px] text-slate-600">
                Hiển thị gợn nước màu xanh nhạt khi di chuyển chuột ở vùng trống.
              </div>
            </div>
            <input
              id="waterRippleCheckbox"
              name="waterRipple"
              type="checkbox"
              checked={waterRipple}
              onChange={(e) => setWaterRipple(e.target.checked)}
              className="w-4 h-4 accent-blue-600 cursor-pointer"
            />
          </div>

          {/* Setting 2: Legal Database Version */}
          <div className="p-3 bg-blue-50 rounded-xl border border-blue-200/60">
            <label htmlFor="lawDatabaseSelect" className="block font-bold text-xs mb-1">Cơ sở dữ liệu biểu thuế Hải quan</label>
            <select
              id="lawDatabaseSelect"
              name="lawDatabase"
              value={lawDatabase}
              onChange={(e) => setLawDatabase(e.target.value)}
              className="w-full bg-white border border-blue-200 rounded-lg p-2 text-xs text-slate-900"
            >
              <option value="2023-2024">Cập nhật mới nhất 2023 - 2024 (Đầy đủ AJCEP, VJEPA, EVFTA)</option>
              <option value="2022">Biểu thuế Hải quan 2022</option>
            </select>
          </div>

          {/* Setting 3: Font Size */}
          <div className="p-3 bg-blue-50 rounded-xl border border-blue-200/60">
            <label className="block font-bold text-xs mb-1">Kích thước chữ trong đoạn chat</label>
            <div className="flex gap-2">
              {['small', 'medium', 'large'].map((size) => (
                <button
                  key={size}
                  onClick={() => setFontSize(size)}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg capitalize border ${
                    fontSize === size
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-600 border-blue-200'
                  }`}
                >
                  {size === 'small' ? 'Nhỏ' : size === 'medium' ? 'Vừa' : 'Lớn'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-blue-200 flex justify-between items-center">
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
            className="bg-blue-600 text-white font-bold text-xs px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-all cursor-pointer disabled:opacity-60"
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
