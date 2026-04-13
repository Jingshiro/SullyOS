
import React, { useState } from 'react';
import Modal from './Modal';
import { useOS } from '../../context/OSContext';

interface WebDAVSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const WebDAVSettingsModal: React.FC<WebDAVSettingsModalProps> = ({ isOpen, onClose }) => {
    const { webdavConfig, updateWebDAVConfig, syncToWebDAV, restoreFromWebDAV, addToast, sysOperation } = useOS();
    const [isTesting, setIsTesting] = useState(false);

    const handleSave = () => {
        onClose();
    };

    const handleSync = async () => {
        try {
            await syncToWebDAV();
        } catch (e: any) {
            // Error already toasted in context
        }
    };

    const handleRestore = async () => {
        if (confirm('确定要从云端恢复吗？这会覆盖当前所有本地数据并重启系统！')) {
            try {
                await restoreFromWebDAV();
            } catch (e: any) {
                // Error already toasted in context
            }
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="WebDAV 云同步配置">
            <div className="space-y-4 p-1">
                <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-700 leading-relaxed">
                    <p>配置 WebDAV 后，你可以将所有角色、聊天记录和设置备份到云端。推荐使用坚果云、Nextcloud 或自建服务器。</p>
                    <p className="mt-1 font-bold text-blue-800">⚠️ 本地 localhost 可能会遭遇 CORS 跨域问题，建议云端部署后使用。</p>
                </div>

                <div className="space-y-3">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">服务器地址 (URL)</label>
                        <input
                            type="text"
                            className="w-full p-2 bg-slate-100 rounded-md text-sm outline-none focus:ring-2 ring-indigo-500/20"
                            placeholder="https://dav.jianguoyun.com/dav/"
                            value={webdavConfig.url}
                            onChange={(e) => updateWebDAVConfig({ url: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">用户名</label>
                            <input
                                type="text"
                                className="w-full p-2 bg-slate-100 rounded-md text-sm outline-none focus:ring-2 ring-indigo-500/20"
                                placeholder="Email 或 账号"
                                value={webdavConfig.username}
                                onChange={(e) => updateWebDAVConfig({ username: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">密码 / 授权码</label>
                            <input
                                type="password"
                                className="w-full p-2 bg-slate-100 rounded-md text-sm outline-none focus:ring-2 ring-indigo-500/20"
                                placeholder="******"
                                value={webdavConfig.password}
                                onChange={(e) => updateWebDAVConfig({ password: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">同步路径</label>
                        <input
                            type="text"
                            className="w-full p-2 bg-slate-100 rounded-md text-sm outline-none focus:ring-2 ring-indigo-500/20"
                            placeholder="/SullyOS"
                            value={webdavConfig.path}
                            onChange={(e) => updateWebDAVConfig({ path: e.target.value })}
                        />
                        <p className="text-[10px] text-slate-400 mt-1">备份文件将保存在该目录下</p>
                    </div>
                </div>

                <div className="pt-2 flex flex-col gap-2">
                    <button
                        onClick={handleSync}
                        disabled={sysOperation.status === 'processing'}
                        className="w-full py-2.5 bg-indigo-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 active:scale-95 transition-transform disabled:opacity-50"
                    >
                        {sysOperation.status === 'processing' ? `同步中 ${sysOperation.progress}%` : '立即同步到云端'}
                    </button>
                    
                    <button
                        onClick={handleRestore}
                        disabled={sysOperation.status === 'processing'}
                        className="w-full py-2.5 bg-white border-2 border-slate-100 text-slate-600 rounded-xl text-sm font-bold active:scale-95 transition-transform disabled:opacity-50"
                    >
                        从云端下载并恢复
                    </button>
                </div>

                <div className="pt-2 border-t border-slate-100">
                   <button
                        onClick={handleSave}
                        className="w-full py-2 bg-slate-800 text-white rounded-xl text-sm font-medium active:scale-95 transition-transform"
                    >
                        保存配置
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default WebDAVSettingsModal;
