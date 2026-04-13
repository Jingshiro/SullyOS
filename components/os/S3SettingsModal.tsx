import React, { useState } from 'react';
import Modal from './Modal';
import { useOS } from '../../context/OSContext';

interface S3SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const S3SettingsModal: React.FC<S3SettingsModalProps> = ({ isOpen, onClose }) => {
    const { s3Config, updateS3Config, syncToS3, restoreFromS3, addToast, sysOperation } = useOS();

    const handleSave = () => {
        onClose();
    };

    const handleSync = async () => {
        try {
            await syncToS3();
        } catch (e: any) {
            // Error already toasted in context
        }
    };

    const handleRestore = async () => {
        if (confirm('确定要从云端恢复吗？这会覆盖当前所有本地数据并重启系统！')) {
            try {
                await restoreFromS3();
            } catch (e: any) {
                // Error already toasted in context
            }
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="S3 / R2 云同步配置">
            <div className="space-y-4 p-1">
                <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-700 leading-relaxed">
                    <p>配置 S3 或 Cloudflare R2 后，你可以将所有角色、聊天记录和设置备份到云端 Bucket 中。</p>
                    <p className="mt-1 font-bold text-blue-800">⚠️ 请务必在云存储后台配置 CORS 规则，允许跨域访问。</p>
                </div>

                <div className="space-y-3">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Endpoint (API URL)</label>
                        <input
                            type="text"
                            className="w-full p-2 bg-slate-100 rounded-md text-sm outline-none focus:ring-2 ring-indigo-500/20"
                            placeholder="https://<account_id>.r2.cloudflarestorage.com"
                            value={s3Config.endpoint}
                            onChange={(e) => updateS3Config({ endpoint: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Access Key ID</label>
                            <input
                                type="text"
                                className="w-full p-2 bg-slate-100 rounded-md text-sm outline-none focus:ring-2 ring-indigo-500/20"
                                placeholder="输入 Access Key"
                                value={s3Config.accessKeyId}
                                onChange={(e) => updateS3Config({ accessKeyId: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Secret Access Key</label>
                            <input
                                type="password"
                                className="w-full p-2 bg-slate-100 rounded-md text-sm outline-none focus:ring-2 ring-indigo-500/20"
                                placeholder="******"
                                value={s3Config.secretAccessKey}
                                onChange={(e) => updateS3Config({ secretAccessKey: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Bucket 名称</label>
                            <input
                                type="text"
                                className="w-full p-2 bg-slate-100 rounded-md text-sm outline-none focus:ring-2 ring-indigo-500/20"
                                placeholder="sullyos-backup"
                                value={s3Config.bucketName}
                                onChange={(e) => updateS3Config({ bucketName: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Region (区域)</label>
                            <input
                                type="text"
                                className="w-full p-2 bg-slate-100 rounded-md text-sm outline-none focus:ring-2 ring-indigo-500/20"
                                placeholder="auto (R2默认)"
                                value={s3Config.region}
                                onChange={(e) => updateS3Config({ region: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">备份前缀路径 (可选)</label>
                        <input
                            type="text"
                            className="w-full p-2 bg-slate-100 rounded-md text-sm outline-none focus:ring-2 ring-indigo-500/20"
                            placeholder="backups/"
                            value={s3Config.path}
                            onChange={(e) => updateS3Config({ path: e.target.value })}
                        />
                    </div>
                </div>

                <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-3">
                    <button
                        onClick={handleSync}
                        disabled={sysOperation.status === 'processing' || !s3Config.endpoint || !s3Config.accessKeyId || !s3Config.secretAccessKey || !s3Config.bucketName}
                        className={`py-3 rounded-xl text-sm font-bold shadow-sm transition-all flex justify-center items-center gap-2 ${
                            sysOperation.status === 'processing' || !s3Config.endpoint || !s3Config.accessKeyId || !s3Config.secretAccessKey || !s3Config.bucketName
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 active:scale-95'
                        }`}
                    >
                        {sysOperation.status === 'processing' ? '处理中...' : '立即备份到云端'}
                    </button>

                    <button
                        onClick={handleRestore}
                        disabled={sysOperation.status === 'processing' || !s3Config.endpoint || !s3Config.accessKeyId || !s3Config.secretAccessKey || !s3Config.bucketName}
                        className={`py-3 rounded-xl text-sm font-bold shadow-sm transition-all flex justify-center items-center gap-2 ${
                            sysOperation.status === 'processing' || !s3Config.endpoint || !s3Config.accessKeyId || !s3Config.secretAccessKey || !s3Config.bucketName
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                : 'bg-rose-50 text-rose-600 hover:bg-rose-100 active:scale-95'
                        }`}
                    >
                        从云端恢复
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default S3SettingsModal;