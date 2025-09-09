import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { useAuth } from '../../contexts/AuthContext';
import { CompanyProfile, JobPosition, KanbanStage, Template, TestLibraryItem, UserWithPassword } from '../../types';
import { useSettings } from '../../contexts/SettingsContext';
import { useToast } from '../../contexts/ToastContext';
import { useTemplates } from '../../contexts/TemplateContext';
import { aiService, isApiKeySet } from '../../services/aiService';
import { useCandidates } from '../../contexts/CandidatesContext';
import { useTheme } from '../../contexts/ThemeContext';

const UserManagementPanel: React.FC = () => {
  const { users, addUser, updateUser, deleteUser, changePassword, user: currentUser } = useAuth();
  const [editingUser, setEditingUser] = useState<UserWithPassword | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const { addToast } = useToast();

  React.useEffect(() => {
    if (editingUser) {
        setUsername(editingUser.username);
        setName(editingUser.name);
        setIsAdmin(editingUser.isAdmin);
        setPassword('');
    } else {
        setUsername('');
        setName('');
        setPassword('');
        setIsAdmin(false);
    }
  }, [editingUser]);

  const handleSelectUserForEdit = (user: UserWithPassword) => {
    setIsAdding(false);
    setEditingUser(user);
  };
  
  const handleAddNew = () => {
    setIsAdding(true);
    setEditingUser(null);
    setUsername('');
    setName('');
    setPassword('');
    setIsAdmin(false);
  }

  const handleSave = async () => {
    if (!username || !name) {
        addToast('نام کاربری و نام کامل الزامی است.', 'error');
        return;
    }
    const userData = { username: username.toLowerCase(), name, password, isAdmin };
    
    setIsSaving(true);
    try {
        if (isAdding) {
            if (!password) {
                addToast('رمز عبور برای کاربر جدید الزامی است.', 'error');
                return;
            }
            await addUser(userData);
        } else if (editingUser) {
            updateUser(editingUser.username, { name, isAdmin });
            if(password) {
                // Admin is resetting the password, no oldPass needed.
                await changePassword(editingUser.username, '', password, true);
            }
        }
        setEditingUser(null);
        setIsAdding(false);
    } catch(e) {
        // Error toast is handled in context
    } finally {
        setIsSaving(false);
    }
  };

  const handleDelete = (usernameToDelete: string) => {
    if (usernameToDelete === currentUser?.username) {
        addToast('شما نمی‌توانید حساب کاربری خود را حذف کنید.', 'error');
        return;
    }
    if (window.confirm(`آیا از حذف کاربر ${usernameToDelete} مطمئن هستید؟`)) {
        deleteUser(usernameToDelete);
        if (editingUser?.username === usernameToDelete) {
          setEditingUser(null);
        }
    }
  };
  
  const activeUsers = Object.values(users);

  return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <h3 className="font-bold mb-2">لیست کاربران</h3>
          <div className="space-y-2">
            {activeUsers.map(u => (
              <div key={u.username} className={`p-2 rounded-md cursor-pointer flex justify-between items-center ${editingUser?.username === u.username || (isAdding && !editingUser) ? 'bg-[var(--color-primary-100)]' : 'hover:bg-gray-100'}`} onClick={() => handleSelectUserForEdit(u)}>
                <span>{u.name} ({u.isAdmin ? 'ادمین' : 'کارشناس'})</span>
                { u.username !== currentUser?.username &&
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(u.username); }} className="text-red-500 hover:text-red-700 text-xs px-1">حذف</button>
                }
              </div>
            ))}
          </div>
           <button onClick={handleAddNew} className={`mt-4 w-full font-bold py-2 px-4 rounded-lg transition-colors ${isAdding ? 'bg-[var(--color-primary-200)] text-[var(--color-primary-800)]' : 'bg-[var(--color-primary-100)] text-[var(--color-primary-700)] hover:bg-[var(--color-primary-200)]'}`}>+ افزودن کاربر جدید</button>
        </div>

        <div className="md:col-span-2">
            {(editingUser || isAdding) && (
            <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-bold mb-4">{isAdding ? 'افزودن کاربر جدید' : `ویرایش کاربر: ${editingUser?.name}`}</h3>
                 <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">نام کاربری</label>
                        <input type="text" value={username} onChange={e => setUsername(e.target.value)} disabled={!isAdding} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 disabled:bg-gray-200"/>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">نام کامل</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"/>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">رمز عبور</label>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={isAdding ? 'ضروری' : 'برای عدم تغییر، خالی بگذارید'} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"/>
                    </div>
                     <div className="flex items-center">
                        <input id="isAdmin" type="checkbox" checked={isAdmin} onChange={e => setIsAdmin(e.target.checked)} disabled={currentUser?.username === username} className="h-4 w-4 text-[var(--color-primary-600)] border-gray-300 rounded disabled:opacity-50"/>
                        <label htmlFor="isAdmin" className="mr-2 block text-sm text-gray-900">دسترسی ادمین</label>
                    </div>
                    <div className="flex justify-end gap-2">
                         <button onClick={() => { setEditingUser(null); setIsAdding(false); }} className="bg-gray-200 text-gray-800 py-2 px-4 rounded-lg">انصراف</button>
                         <button onClick={handleSave} disabled={isSaving} className="bg-[var(--color-primary-600)] text-white py-2 px-4 rounded-lg disabled:bg-gray-400">
                           {isSaving ? 'در حال ذخیره...' : 'ذخیره'}
                         </button>
                    </div>
                 </div>
            </div>
            )}
        </div>
      </div>
  );
};

const SourceManagementPanel: React.FC = () => {
    const { sources, addSource, deleteSource } = useSettings();
    const [newSource, setNewSource] = useState('');

    const handleAddSource = () => {
        addSource(newSource);
        setNewSource('');
    };

    return (
        <div className="max-w-md mx-auto">
            <h3 className="font-bold mb-4">لیست منابع</h3>
            <div className="space-y-2 mb-4">
                {sources.map(s => (
                    <div key={s} className="flex justify-between items-center bg-gray-100 p-2 rounded-md">
                        <span>{s}</span>
                        <button onClick={() => deleteSource(s)} className="text-red-500 hover:text-red-700 text-xs">حذف</button>
                    </div>
                ))}
            </div>
             <div className="flex gap-2">
                <input 
                    type="text" 
                    value={newSource} 
                    onChange={e => setNewSource(e.target.value)} 
                    placeholder="افزودن منبع جدید..." 
                    className="flex-grow border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)] sm:text-sm"
                />
                <button onClick={handleAddSource} className="bg-[var(--color-primary-600)] text-white py-2 px-4 rounded-lg hover:bg-[var(--color-primary-700)]">افزودن</button>
             </div>
        </div>
    );
};

const StageManagementPanel: React.FC = () => {
    const { stages, addStage, updateStage, deleteStage } = useSettings();
    const { candidates } = useCandidates();
    const { addToast } = useToast();
    const [newStageTitle, setNewStageTitle] = useState('');
    const [editingStage, setEditingStage] = useState<KanbanStage | null>(null);

    const handleAddStage = () => {
        addStage(newStageTitle);
        setNewStageTitle('');
    };

    const handleSaveEdit = () => {
        if (editingStage) {
            updateStage(editingStage.id, editingStage.title);
            setEditingStage(null);
        }
    };

    const handleDelete = (id: string) => {
        if (candidates.some(c => c.stage === id)) {
            addToast('نمی‌توان مرحله‌ای که دارای متقاضی است را حذف کرد.', 'error');
            return;
        }
        deleteStage(id);
    };

    return (
      <div className="max-w-md mx-auto">
        <h3 className="font-bold mb-4">لیست مراحل کانبان</h3>
        <div className="space-y-2 mb-4">
          {stages.filter(s => s.id !== 'archived').map(stage => (
            <div key={stage.id} className="flex justify-between items-center bg-gray-100 p-2 rounded-md">
              {editingStage?.id === stage.id ? (
                <input
                  type="text"
                  value={editingStage.title}
                  onChange={e => setEditingStage({ ...editingStage, title: e.target.value })}
                  className="flex-grow border-gray-300 rounded-md py-1 px-2 text-sm"
                />
              ) : (
                <span>{stage.title}</span>
              )}
              <div className="flex gap-3">
                {editingStage?.id === stage.id ? (
                  <button onClick={handleSaveEdit} className="text-green-600 hover:text-green-800 text-xs">ذخیره</button>
                ) : (
                  <button onClick={() => setEditingStage(stage)} className="text-blue-600 hover:text-blue-800 text-xs">ویرایش</button>
                )}
                {!stage.isCore && (
                  <button onClick={() => handleDelete(stage.id)} className="text-red-500 hover:text-red-700 text-xs">حذف</button>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newStageTitle}
            onChange={e => setNewStageTitle(e.target.value)}
            placeholder="افزودن مرحله جدید..."
            className="flex-grow border border-gray-300 rounded-md shadow-sm py-2 px-3 sm:text-sm"
          />
          <button onClick={handleAddStage} className="bg-[var(--color-primary-600)] text-white py-2 px-4 rounded-lg hover:bg-[var(--color-primary-700)]">افزودن</button>
        </div>
      </div>
    );
};

const TemplateManagementPanel: React.FC = () => {
  const { templates, addTemplate, updateTemplate, deleteTemplate } = useTemplates();
  const { stages } = useSettings();
  const [editingId, setEditingId] = useState<string | null | 'new'>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<'email' | 'whatsapp'>('email');
  const [stageId, setStageId] = useState<string>('');
  
  const [isAiLoading, setIsAiLoading] = useState(false);
  const { addToast } = useToast();
  const apiKeySet = isApiKeySet();

  const handleAddNewClick = () => {
    setEditingId('new');
    setName('');
    setContent('');
    setType('email');
    setStageId('');
  };

  const handleEditClick = (template: Template) => {
    setEditingId(template.id);
    setName(template.name);
    setContent(template.content);
    setType(template.type);
    setStageId(template.stageId || '');
  };

  const handleCancel = () => {
    setEditingId(null);
  };

  const handleSave = () => {
    const templateData = { name, content, type, stageId: stageId || undefined };
    if (editingId === 'new') {
      addTemplate(templateData);
    } else if (editingId) {
      updateTemplate({ id: editingId, ...templateData });
    }
    setEditingId(null);
  };
  
  const handleDelete = (id: string) => {
      if(window.confirm('آیا از حذف این قالب مطمئن هستید؟')) {
          deleteTemplate(id);
          if (editingId === id) {
              setEditingId(null);
          }
      }
  };
  
  const handleGenerateWithAI = async () => {
      if (!name) {
          addToast("لطفا ابتدا یک نام یا هدف برای قالب مشخص کنید.", 'error');
          return;
      }
      setIsAiLoading(true);
      try {
          const generatedContent = await aiService.generateTemplateContent(`ایجاد یک قالب ${type === 'email' ? 'ایمیل' : 'واتسپ'} برای: ${name}`);
          setContent(generatedContent);
      } catch (e: any) {
          addToast(e.message, 'error');
      } finally {
          setIsAiLoading(false);
      }
  };

  const handleCopyVariable = async (variable: string) => {
    try {
      await navigator.clipboard.writeText(variable);
      addToast(`متغیر ${variable} کپی شد!`, 'success');
    } catch (err) {
      console.warn('Could not copy text with clipboard API: ', err);
      // Fallback for older browsers or non-secure contexts
      const textArea = document.createElement("textarea");
      textArea.value = variable;
      // Make the textarea out of sight
      textArea.style.position = "fixed";
      textArea.style.top = "-9999px";
      textArea.style.left = "-9999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        const successful = document.execCommand('copy');
        if (successful) {
          addToast(`متغیر ${variable} کپی شد!`, 'success');
        } else {
          throw new Error('Fallback copy command failed.');
        }
      } catch (execErr) {
        console.error('Fallback copy failed: ', execErr);
        addToast('خطا در کپی کردن متغیر.', 'error');
      } finally {
        document.body.removeChild(textArea);
      }
    }
  };
  
  const availableVariables = [
    { name: '{{candidateName}}', desc: 'نام کامل متقاضی' },
    { name: '{{position}}', desc: 'موقعیت شغلی' },
    { name: '{{interviewDate}}', desc: 'تاریخ مصاحبه' },
    { name: '{{interviewTime}}', desc: 'ساعت مصاحبه' },
    { name: '{{stageName}}', desc: 'نام مرحله جدید (فقط برای اطلاع‌رسانی)' },
    { name: '{{companyName}}', desc: 'نام شرکت' },
    { name: '{{companyWebsite}}', desc: 'وب‌سایت شرکت' },
    { name: '{{companyAddress}}', desc: 'آدرس شرکت' },
  ];

  const renderForm = () => (
    <div className="bg-gray-50 rounded-lg p-4 mt-2 border border-[var(--color-primary-200)]">
      <h3 className="font-bold mb-4">{editingId === 'new' ? 'افزودن قالب جدید' : 'ویرایش قالب'}</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">نام قالب (مثلا: ایمیل پیشنهاد شغلی)</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" />
        </div>
        <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">نوع</label>
              <select value={type} onChange={e => setType(e.target.value as 'email' | 'whatsapp')} className="mt-1 block w-full border border-gray-300 bg-white rounded-md shadow-sm py-2 px-3">
                <option value="email">ایمیل</option>
                <option value="whatsapp">واتسپ</option>
              </select>
            </div>
             <div>
              <label className="block text-sm font-medium text-gray-700">مربوط به مرحله (اختیاری)</label>
              <select value={stageId} onChange={e => setStageId(e.target.value)} className="mt-1 block w-full border border-gray-300 bg-white rounded-md shadow-sm py-2 px-3">
                <option value="">عمومی</option>
                {stages.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
              </select>
            </div>
        </div>
        <div>
           <div className="flex justify-between items-center">
              <label className="block text-sm font-medium text-gray-700">محتوای قالب</label>
              <button onClick={handleGenerateWithAI} disabled={isAiLoading || !apiKeySet} title={!apiKeySet ? "ویژگی هوش مصنوعی غیرفعال است. لطفاً کلید API را تنظیم کنید." : "تولید محتوا با هوش مصنوعی"} className="text-sm text-[var(--color-primary-600)] hover:text-[var(--color-primary-800)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-[var(--color-primary-600)]">
                  {isAiLoading ? 'در حال پردازش...' : 'تولید با AI ✨'}
              </button>
           </div>
          <textarea value={content} onChange={e => setContent(e.target.value)} rows={8} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" placeholder="محتوای خود را وارد کنید یا با AI تولید کنید."></textarea>
           
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="text-sm font-bold text-blue-800 mb-2">متغیرهای در دسترس (برای کپی کلیک کنید)</h4>
                <div className="flex flex-wrap gap-2">
                    {availableVariables.map(variable => (
                        <button 
                          key={variable.name}
                          onClick={() => handleCopyVariable(variable.name)}
                          title={variable.desc}
                          className="px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-xs font-mono hover:bg-blue-200 transition-colors"
                        >
                            {variable.name}
                        </button>
                    ))}
                </div>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={handleCancel} className="bg-gray-200 text-gray-800 py-2 px-4 rounded-lg">انصراف</button>
          <button onClick={handleSave} className="bg-[var(--color-primary-600)] text-white py-2 px-4 rounded-lg">ذخیره</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-gray-800">مدیریت قالب‌ها</h3>
        {editingId === null && (
          <button 
            onClick={handleAddNewClick} 
            className="bg-[var(--color-primary-600)] text-white font-bold py-2 px-4 rounded-lg hover:bg-[var(--color-primary-700)] transition-colors text-sm"
          >
            + افزودن قالب جدید
          </button>
        )}
      </div>

      {editingId === 'new' && renderForm()}

      <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
        {templates.map(template => (
          <div key={template.id} className="p-4 bg-white rounded-lg shadow-sm border border-gray-200">
            {editingId === template.id ? (
              renderForm()
            ) : (
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 break-words">{template.name}</p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${template.type === 'email' ? 'bg-sky-100 text-sky-800' : 'bg-green-100 text-green-800'}`}>
                          {template.type === 'email' ? 'ایمیل' : 'واتسپ'}
                      </span>
                      {template.stageId && (
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-200 text-gray-700">
                              مرحله: {stages.find(s => s.id === template.stageId)?.title || 'نامشخص'}
                          </span>
                      )}
                  </div>
                </div>
                <div className="flex-shrink-0 flex items-center gap-3">
                  <button onClick={() => handleEditClick(template)} className="text-blue-600 hover:text-blue-800 text-sm font-medium">ویرایش</button>
                  <button onClick={() => handleDelete(template.id)} className="text-red-500 hover:text-red-700 text-sm font-medium">حذف</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};


const CompanyProfilePanel: React.FC = () => {
    const { companyProfile, updateCompanyDetails, addJobPosition, updateJobPosition, deleteJobPosition } = useSettings();
    const [details, setDetails] = useState(companyProfile);
    const [newJobTitle, setNewJobTitle] = useState('');
    const [editingJob, setEditingJob] = useState<JobPosition | null>(null);

    useEffect(() => {
        setDetails(companyProfile);
    }, [companyProfile]);

    const handleDetailChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setDetails(prev => ({...prev, [e.target.name]: e.target.value}));
    }
    
    const handleSaveDetails = () => {
        const {name, website, address} = details;
        updateCompanyDetails({name, website, address});
    }

    const handleAddJob = () => {
        addJobPosition(newJobTitle);
        setNewJobTitle('');
    }

    const handleSaveJobEdit = () => {
        if(editingJob) {
            updateJobPosition(editingJob.id, editingJob.title);
            setEditingJob(null);
        }
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Company Details */}
            <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-800">اطلاعات شرکت</h3>
                <div>
                    <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">نام شرکت</label>
                    <input type="text" name="name" id="companyName" value={details.name} onChange={handleDetailChange} onBlur={handleSaveDetails} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" />
                </div>
                <div>
                    <label htmlFor="website" className="block text-sm font-medium text-gray-700">وب‌سایت</label>
                    <input type="text" name="website" id="website" value={details.website} onChange={handleDetailChange} onBlur={handleSaveDetails} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" />
                </div>
                <div>
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700">آدرس</label>
                    <textarea name="address" id="address" value={details.address} onChange={handleDetailChange} onBlur={handleSaveDetails} rows={3} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3" />
                </div>
            </div>

            {/* Job Positions */}
            <div>
                 <h3 className="text-lg font-bold text-gray-800 mb-4">موقعیت‌های شغلی</h3>
                 <div className="space-y-2 mb-4">
                    {companyProfile.jobPositions.map(job => (
                        <div key={job.id} className="flex justify-between items-center bg-gray-100 p-2 rounded-md">
                           {editingJob?.id === job.id ? (
                               <input type="text" value={editingJob.title} onChange={e => setEditingJob({...editingJob, title: e.target.value})} className="flex-grow border-gray-300 rounded-md py-1 px-2 text-sm"/>
                           ) : (
                               <span>{job.title}</span>
                           )}
                            <div className="flex gap-2">
                               {editingJob?.id === job.id ? (
                                  <button onClick={handleSaveJobEdit} className="text-green-600 hover:text-green-800">ذخیره</button>
                               ) : (
                                  <button onClick={() => setEditingJob(job)} className="text-blue-600 hover:text-blue-800">ویرایش</button>
                               )}
                                <button onClick={() => deleteJobPosition(job.id)} className="text-red-500 hover:text-red-700">حذف</button>
                            </div>
                        </div>
                    ))}
                 </div>
                 <div className="flex gap-2">
                     <input type="text" value={newJobTitle} onChange={e => setNewJobTitle(e.target.value)} placeholder="افزودن موقعیت جدید..." className="flex-grow border border-gray-300 rounded-md shadow-sm py-2 px-3 sm:text-sm" />
                     <button onClick={handleAddJob} className="bg-[var(--color-primary-600)] text-white py-2 px-4 rounded-lg hover:bg-[var(--color-primary-700)]">افزودن</button>
                 </div>
            </div>
        </div>
    )
}

const ApiKeyPanel: React.FC = () => {
    const [isKeySet, setIsKeySet] = useState(false);

    useEffect(() => {
        // Safely check for API key to prevent crash when not using the build process.
        let keyAvailable = false;
        try {
            // The build process replaces process.env.API_KEY with the actual value.
            // If it's a non-empty string, the key is set.
            if (process.env.API_KEY) {
                keyAvailable = true;
            }
        } catch (e) {
            // process is not defined, so the key is not available.
            keyAvailable = false;
        }
        setIsKeySet(keyAvailable);
    }, []);

    return (
        <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-bold text-gray-800 mb-2">پیکربندی کلید API (Gemini)</h3>
            <div className="flex items-center gap-2 mb-4">
                <p className="font-medium">وضعیت کلید:</p>
                {isKeySet ? (
                    <span className="px-3 py-1 text-sm font-semibold text-green-800 bg-green-200 rounded-full">فعال و پیکربندی شده</span>
                ) : (
                    <span className="px-3 py-1 text-sm font-semibold text-red-800 bg-red-200 rounded-full">پیکربندی نشده</span>
                )}
            </div>
            <div className="space-y-2 text-sm text-gray-700">
                <p><strong className="font-bold text-red-600">نکته امنیتی مهم:</strong> برای حفظ امنیت، کلید API هرگز نباید مستقیماً در رابط کاربری برنامه وارد شود.</p>
                <p>روش صحیح و امن، تنظیم کلید به عنوان یک متغیر محیطی (Environment Variable) در محیطی است که برنامه در آن اجرا می‌شود.</p>
                <p>لطفا از مدیر سیستم بخواهید متغیر محیطی با نام <code className="bg-gray-200 text-red-700 p-1 rounded font-mono">API_KEY</code> را با مقدار کلید Gemini شما تنظیم کند.</p>
                 {!isKeySet && <p className="font-bold mt-2">تا زمانی که کلید پیکربندی نشود، قابلیت‌های هوش مصنوعی کار نخواهند کرد.</p>}
            </div>
        </div>
    )
}

const TestLibraryPanel: React.FC = () => {
    const { testLibrary, addTest, updateTest, deleteTest } = useSettings();
    
    // State for inline editing
    const [editingTestId, setEditingTestId] = useState<string | null>(null);
    const [editedName, setEditedName] = useState('');
    const [editedUrl, setEditedUrl] = useState('');

    // State for adding a new test
    const [isAdding, setIsAdding] = useState(false);
    const [newName, setNewName] = useState('');
    const [newUrl, setNewUrl] = useState('');

    const handleEditClick = (test: TestLibraryItem) => {
        setEditingTestId(test.id);
        setEditedName(test.name);
        setEditedUrl(test.url);
        setIsAdding(false); // Ensure add form is closed
    };

    const handleCancelEdit = () => {
        setEditingTestId(null);
    };

    const handleSaveEdit = () => {
        if (editingTestId) {
            updateTest({ id: editingTestId, name: editedName, url: editedUrl });
            setEditingTestId(null);
        }
    };
    
    const handleAddNewClick = () => {
        setIsAdding(true);
        setNewName('');
        setNewUrl('');
        setEditingTestId(null); // Ensure edit mode is closed
    };
    
    const handleCancelAdd = () => {
        setIsAdding(false);
    };

    const handleSaveNew = () => {
        addTest({ name: newName, url: newUrl });
        setIsAdding(false);
    };

    const handleDelete = (id: string) => {
        if (window.confirm("آیا از حذف این آزمون از کتابخانه مطمئن هستید؟")) {
            deleteTest(id);
            if (editingTestId === id) {
                setEditingTestId(null);
            }
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-800">کتابخانه آزمون‌ها</h3>
                {!isAdding && (
                    <button 
                        onClick={handleAddNewClick} 
                        className="bg-[var(--color-primary-600)] text-white font-bold py-2 px-4 rounded-lg hover:bg-[var(--color-primary-700)] transition-colors text-sm"
                    >
                        + افزودن آزمون جدید
                    </button>
                )}
            </div>

            {isAdding && (
                <div className="p-4 bg-gray-100 rounded-lg space-y-3 border border-[var(--color-primary-200)]">
                     <h4 className="font-bold">آزمون جدید</h4>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">نام آزمون</label>
                        <input type="text" value={newName} onChange={e => setNewName(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">لینک (URL)</label>
                        <input type="url" value={newUrl} onChange={e => setNewUrl(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"/>
                    </div>
                    <div className="flex justify-end gap-2">
                        <button onClick={handleCancelAdd} className="bg-gray-200 text-gray-800 py-2 px-4 rounded-lg text-sm">انصراف</button>
                        <button onClick={handleSaveNew} className="bg-green-600 text-white py-2 px-4 rounded-lg text-sm">ذخیره</button>
                    </div>
                </div>
            )}

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                {testLibrary.map(test => (
                    <div key={test.id} className="p-4 bg-white rounded-lg shadow-sm border border-gray-200">
                        {editingTestId === test.id ? (
                            // Edit Mode
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">نام آزمون</label>
                                    <input type="text" value={editedName} onChange={e => setEditedName(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"/>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">لینک (URL)</label>
                                    <input type="url" value={editedUrl} onChange={e => setEditedUrl(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3"/>
                                </div>
                                <div className="flex justify-end items-center gap-2 pt-2">
                                    <button onClick={handleCancelEdit} className="bg-gray-200 text-gray-800 py-2 px-4 rounded-lg text-sm">انصراف</button>
                                    <button onClick={handleSaveEdit} className="bg-green-600 text-white py-2 px-4 rounded-lg text-sm">ذخیره تغییرات</button>
                                </div>
                            </div>
                        ) : (
                            // View Mode
                            <div className="flex justify-between items-start gap-4">
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-gray-900 break-words">{test.name}</p>
                                    <a href={test.url} target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--color-primary-600)] hover:underline break-all">
                                        {test.url}
                                    </a>
                                </div>
                                <div className="flex-shrink-0 flex items-center gap-3">
                                    <button onClick={() => handleEditClick(test)} className="text-blue-600 hover:text-blue-800 text-sm font-medium">ویرایش</button>
                                    <button onClick={() => handleDelete(test.id)} className="text-red-500 hover:text-red-700 text-sm font-medium">حذف</button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};


const AppearancePanel: React.FC = () => {
    const { theme, setTheme, setCustomBackground, setDefaultBackground } = useTheme();
    const { addToast } = useToast();
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const themes = [
        { id: 'indigo', name: 'نیلی', color: '#4f46e5' },
        { id: 'blue', name: 'آبی', color: '#2563eb' },
        { id: 'teal', name: 'سبزآبی', color: '#0d9488' },
        { id: 'rose', name: 'رز', color: '#e11d48' },
    ];

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) { // 2MB limit
                addToast('حجم فایل باید کمتر از ۲ مگابایت باشد.', 'error');
                return;
            }
            const reader = new FileReader();
            reader.onload = (e) => {
                if(typeof e.target?.result === 'string') {
                    setCustomBackground(e.target.result);
                    addToast('پس‌زمینه با موفقیت تغییر کرد.', 'success');
                }
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-bold text-gray-800 mb-3">تم رنگی</h3>
                <div className="flex flex-wrap gap-4">
                    {themes.map(t => (
                        <div key={t.id} className="flex flex-col items-center gap-2 cursor-pointer" onClick={() => setTheme(t.id as any)}>
                            <div style={{ backgroundColor: t.color }} className={`w-12 h-12 rounded-full ring-2 ${theme === t.id ? 'ring-offset-2 ring-[var(--color-primary-500)]' : 'ring-transparent'}`}></div>
                            <span className={`text-sm font-medium ${theme === t.id ? 'text-[var(--color-primary-600)]' : 'text-gray-600'}`}>{t.name}</span>
                        </div>
                    ))}
                </div>
            </div>
            <div>
                <h3 className="text-lg font-bold text-gray-800 mb-3">پس‌زمینه</h3>
                <div className="flex flex-wrap items-center gap-4">
                     <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/png, image/jpeg, image/gif, image/webp" className="hidden"/>
                     <button onClick={() => fileInputRef.current?.click()} className="bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700">آپلود تصویر پس‌زمینه</button>
                     <button onClick={setDefaultBackground} className="bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300">حذف پس‌زمینه</button>
                </div>
                 <p className="text-xs text-gray-500 mt-2">فایل‌های کمتر از ۲ مگابایت توصیه می‌شود.</p>
            </div>
        </div>
    );
};


interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
    type Tab = 'appearance' | 'profile' | 'stages' | 'users' | 'sources' | 'templates' | 'apiKey' | 'tests';
    const [activeTab, setActiveTab] = useState<Tab>('appearance');

    const tabClasses = (tabName: Tab) => 
        `whitespace-nowrap py-2 px-4 font-medium text-sm rounded-t-lg transition-colors cursor-pointer ${
            activeTab === tabName 
            ? 'bg-white border-gray-200 border-l border-t border-r -mb-px text-[var(--color-primary-600)]' 
            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
        }`;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="تنظیمات" size="large">
            <div className="w-full">
                <div className="border-b border-gray-200">
                    <nav className="flex flex-wrap space-x-2 space-x-reverse">
                        <button onClick={() => setActiveTab('appearance')} className={tabClasses('appearance')}>ظاهر برنامه</button>
                        <button onClick={() => setActiveTab('profile')} className={tabClasses('profile')}>پروفایل شرکت</button>
                        <button onClick={() => setActiveTab('stages')} className={tabClasses('stages')}>مراحل کانبان</button>
                        <button onClick={() => setActiveTab('tests')} className={tabClasses('tests')}>کتابخانه آزمون</button>
                        <button onClick={() => setActiveTab('templates')} className={tabClasses('templates')}>مدیریت قالب‌ها</button>
                        <button onClick={() => setActiveTab('users')} className={tabClasses('users')}>مدیریت کاربران</button>
                        <button onClick={() => setActiveTab('sources')} className={tabClasses('sources')}>مدیریت منابع</button>
                        <button onClick={() => setActiveTab('apiKey')} className={tabClasses('apiKey')}>کلید API</button>
                    </nav>
                </div>
                <div className="pt-6 bg-white p-6 rounded-b-lg">
                    {activeTab === 'appearance' && <AppearancePanel />}
                    {activeTab === 'profile' && <CompanyProfilePanel />}
                    {activeTab === 'stages' && <StageManagementPanel />}
                    {activeTab === 'users' && <UserManagementPanel />}
                    {activeTab === 'sources' && <SourceManagementPanel />}
                    {activeTab === 'templates' && <TemplateManagementPanel />}
                    {activeTab === 'apiKey' && <ApiKeyPanel />}
                    {activeTab === 'tests' && <TestLibraryPanel />}
                </div>
            </div>
        </Modal>
    );
};

export default SettingsModal;