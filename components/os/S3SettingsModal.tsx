import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { useOS } from '../../context/OSContext';
import { S3BackupClient } from '../../utils/s3Client';

interface S3SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const S3SettingsModal: React.FC<S3SettingsModalProps> = ({ isOpen, onClose }) => {
    const { s3Config, updateS3Config, syncToS3, restoreFromS3, addToast, sysOperation } = useOS();
    
    const [backupName, setBackupName] = useState('Sully_Backup_Latest.zip');
    const [backups, setBackups] = useState<{ key: string, lastModified: string, size: number }[]>([]);
    const [isLoadingList, setIsLoadingList] = useState(false);

    const fetchBackups = async () => {
        if (!s3Config.endpoint || !s3Config.accessKeyId || !s3Config.secretAccessKey || !s3Config.bucketName) return;
        
        setIsLoadingList(true);
        try {
            const list = await S3BackupClient.listBackups(s3Config);
            setBackups(list);
        } catch (e: any) {
            console.error('Failed to fetch S3 backups', e);
            // Don't toast here to avoid spamming if config is wrong
        } finally {
            setIsLoadingList(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchBackups();
        }
    }, [isOpen]);

    const handleSync = async () => {
        let name = backupName.trim();
        if (!name) {
            addToast('请输入备份文件名', 'error');
            return;
        }
        if (!name.endsWith('.zip')) name += '.zip';
        
        try {
            await syncToS3(name);
            fetchBackups(); // Refresh list
        } catch (e: any) {
            // Error already toasted in context
        }
    };

    const handleRestoreItem = async (filename: string) => {
        if (confirm(`确定要从云端恢复存档「${filename}」吗？这会覆盖当前所有本地数据并重启系统！`)) {
            try {
                await restoreFromS3(filename);
            } catch (e: any) {
                // Error already toasted in context
            }
        }
    };

    const handleDeleteItem = async (filename: string) => {
        if (confirm(`确定要删除云端存档「${filename}」吗？此操作不可撤销！`)) {
            try {
                await S3BackupClient.deleteBackup(s3Config, filename);
                addToast('云端存档已删除', 'success');
                fetchBackups();
            } catch (e: any) {
                addToast(`删除失败: ${e.message}`, 'error');
            }
        }
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatDate = (dateStr: string) => {
        try {
            return new Date(dateStr).toLocaleString();
        } catch {
            return dateStr;
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="S3 / Cloudflare R2 云同步">
            <div className="space-y-4 p-1 max-h-[70vh] overflow-y-auto">
                {/* 配置部分 */}
                <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 text-[11px] text-blue-700 leading-relaxed">
                    <p className="font-bold mb-1">💡 推荐使用 Cloudflare R2</p>
                    <p>1. 免费额度高，无流出流量费。</p>
                    <p>2. 请务必在 Bucket 设置中配置 **CORS 策略** (AllowedOrigins 包含当前域名)。</p>
                </div>

                <div className="space-y-3">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Endpoint (API URL)</label>
                        <input
                            type="text"
                            className="w-full p-2 bg-slate-100 rounded-lg text-sm outline-none focus:ring-2 ring-indigo-500/20"
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
                                className="w-full p-2 bg-slate-100 rounded-lg text-sm outline-none focus:ring-2 ring-indigo-500/20"
                                placeholder="Access Key"
                                value={s3Config.accessKeyId}
                                onChange={(e) => updateS3Config({ accessKeyId: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Secret Key</label>
                            <input
                                type="password"
                                className="w-full p-2 bg-slate-100 rounded-lg text-sm outline-none focus:ring-2 ring-indigo-500/20"
                                placeholder="Secret Key"
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
                                className="w-full p-2 bg-slate-100 rounded-lg text-sm outline-none focus:ring-2 ring-indigo-500/20"
                                placeholder="sullyos-backup"
                                value={s3Config.bucketName}
                                onChange={(e) => updateS3Config({ bucketName: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Region</label>
                            <input
                                type="text"
                                className="w-full p-2 bg-slate-100 rounded-lg text-sm outline-none focus:ring-2 ring-indigo-500/20"
                                placeholder="auto"
                                value={s3Config.region}
                                onChange={(e) => updateS3Config({ region: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">自定义存档文件名</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                className="flex-1 p-2 bg-slate-100 rounded-lg text-sm outline-none focus:ring-2 ring-indigo-500/20"
                                placeholder="例如: Sully_Backup_Latest.zip"
                                value={backupName}
                                onChange={(e) => setBackupName(e.target.value)}
                            />
                            <button
                                onClick={handleSync}
                                disabled={sysOperation.status === 'processing' || !s3Config.endpoint || !s3Config.accessKeyId || !s3Config.secretAccessKey || !s3Config.bucketName}
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                                    sysOperation.status === 'processing' || !s3Config.endpoint || !s3Config.accessKeyId || !s3Config.secretAccessKey || !s3Config.bucketName
                                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                        : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 shadow-sm'
                                }`}
                            >
                                {sysOperation.status === 'processing' ? '正在备份...' : '立即备份'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* 存档列表部分 */}
                <div className="pt-4 border-t border-slate-100">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-sm font-bold text-slate-700">云端存档管理</h3>
                        <button 
                            onClick={fetchBackups}
                            className="text-[10px] text-indigo-600 font-bold hover:underline"
                            disabled={isLoadingList}
                        >
                            {isLoadingList ? '加载中...' : '刷新列表'}
                        </button>
                    </div>

                    {backups.length === 0 ? (
                        <div className="bg-slate-50 p-6 rounded-xl text-center text-slate-400 text-xs italic">
                            {isLoadingList ? '正在获取云端列表...' : '暂无云端存档'}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {backups.map((item) => (
                                <div key={item.key} className="bg-white border border-slate-100 p-3 rounded-xl flex items-center justify-between group hover:border-indigo-100 hover:bg-indigo-50/10 transition-colors">
                                    <div className="min-w-0 flex-1">
                                        <div className="text-sm font-medium text-slate-700 truncate" title={item.key}>
                                            {item.key}
                                        </div>
                                        <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2">
                                            <span>{formatSize(item.size)}</span>
                                            <span className="w-1 h-1 rounded-full bg-slate-200" />
                                            <span>{formatDate(item.lastModified)}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 ml-4">
                                        <button
                                            onClick={() => handleRestoreItem(item.key)}
                                            className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 text-[11px] font-bold hover:bg-indigo-100 transition-colors"
                                        >
                                            恢复
                                        </button>
                                        <button
                                            onClick={() => handleDeleteItem(item.key)}
                                            className="p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                                            title="删除"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};

export default S3SettingsModal;