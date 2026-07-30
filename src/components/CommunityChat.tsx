import React, { useState, useEffect, useRef } from 'react';
import {
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  deleteDoc,
  doc,
  serverTimestamp,
  updateDoc,
  getDocs,
  where,
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { ChatMessage, UserProfile, isAdminEmail } from '../types';
import {
  Send,
  X,
  Trash2,
  LogIn,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Minimize2,
  Maximize2,
  Smile,
  Search,
  Pin,
  CheckCheck,
  Paperclip,
  Mic,
  FileText,
  Film,
  Video,
  Image as ImageIcon,
  Download,
  ArrowDown,
  Reply,
  MessageSquare,
  Volume2,
  ArrowLeft,
  Users,
  Award,
  HelpCircle,
  BookOpen,
  Globe,
  Headphones,
  CheckCircle2,
  MoreVertical,
  Play,
  Pause,
  Square,
  UserPlus,
  Mail,
  AtSign,
  Copy,
  Check,
  Share2,
  UserCheck,
  Pencil,
} from 'lucide-react';
import { Language } from '../lib/i18n';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onOpenAuth: () => void;
  lang?: Language;
}

export interface ChatChannel {
  id: string;
  name: string;
  description: string;
  category: 'group' | 'channel' | 'support';
  icon: React.ReactNode;
  bgColor: string;
  membersCount: string;
  lastMessageText?: string;
  lastMessageTime?: string;
  unreadCount?: number;
  isVerified?: boolean;
  avatarUrl?: string;
}

const CHAT_CHANNELS: ChatChannel[] = [
  {
    id: 'general',
    name: 'UniTest Umumiy Hamjamiyat',
    description: "Barcha talabalar va o'quvchilar bilan muloqot guruhi",
    category: 'group',
    icon: <Award className="w-5.5 h-5.5 text-amber-300 drop-shadow-xs" />,
    bgColor: 'bg-gradient-to-tr from-sky-600 via-blue-600 to-indigo-600',
    membersCount: "1 ta a'zo",
    lastMessageText: "Hozircha xabar yo'q",
    lastMessageTime: '',
    isVerified: true,
  },
];

const TELEGRAM_REACTIONS = ['👍', '❤️', '🔥', '👏', '😂', '🎯', '⚡', '💯'];

const AudioMessagePlayer: React.FC<{
  audioUrl?: string;
  durationStr?: string;
  isMe: boolean;
}> = ({ audioUrl, durationStr = '0:05', isMe }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTimeStr, setCurrentTimeStr] = useState('0:00');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!audioUrl) return;

    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    const handleTimeUpdate = () => {
      if (audio.duration && !isNaN(audio.duration) && audio.duration > 0) {
        const pct = (audio.currentTime / audio.duration) * 100;
        setProgress(pct);
        const mins = Math.floor(audio.currentTime / 60);
        const secs = Math.floor(audio.currentTime % 60);
        setCurrentTimeStr(`${mins}:${secs < 10 ? '0' : ''}${secs}`);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
      setCurrentTimeStr('0:00');
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handlePlay = () => {
      setIsPlaying(true);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('play', handlePlay);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('play', handlePlay);
      audioRef.current = null;
    };
  }, [audioUrl]);

  const togglePlay = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!audioUrl) {
      alert("Ushbu xabar uchun ovozli fayl topilmadi.");
      return;
    }

    let audio = audioRef.current;
    if (!audio) {
      audio = new Audio(audioUrl);
      audioRef.current = audio;
    }

    if (isPlaying) {
      audio.pause();
    } else {
      try {
        await audio.play();
      } catch (err) {
        console.error("Audio playback error:", err);
        alert("Ovozli xabarni ijro etib bo'lmadi.");
      }
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const pct = Math.max(0, Math.min(1, clickX / width));
    audio.currentTime = pct * audio.duration;
    setProgress(pct * 100);
  };

  const bars = [35, 65, 45, 80, 100, 75, 40, 90, 65, 50, 85, 95, 60, 40, 70, 85, 50, 35];

  return (
    <div className="flex items-center gap-2.5 py-1 min-w-[210px] max-w-[270px]">
      <button
        type="button"
        onClick={togglePlay}
        className="w-9 h-9 rounded-full flex items-center justify-center shadow-xs transition active:scale-95 shrink-0 bg-[#3390EC] text-white hover:bg-[#2481CC]"
        title={isPlaying ? "To'xtatish" : "Tinglash"}
      >
        {isPlaying ? (
          <Pause className="w-4.5 h-4.5 fill-current" />
        ) : (
          <Play className="w-4.5 h-4.5 fill-current ml-0.5" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div
          onClick={handleSeek}
          className="h-6 flex items-center gap-0.5 cursor-pointer py-0.5 select-none"
          title="Tinglash joyini tanlash"
        >
          {bars.map((height, i) => {
            const barPct = ((i + 1) / bars.length) * 100;
            const isFilled = progress >= barPct;
            return (
              <div
                key={i}
                className={`flex-1 rounded-full transition-all duration-150 ${
                  isFilled ? 'bg-[#3390EC]' : 'bg-slate-300/80'
                }`}
                style={{ height: `${Math.max(25, height)}%` }}
              />
            );
          })}
        </div>

        <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium -mt-0.5">
          <span>{isPlaying ? currentTimeStr : (durationStr || '0:00')}</span>
          <span className="text-slate-400">Ovozli xabar</span>
        </div>
      </div>
    </div>
  );
};

export const CommunityChat: React.FC<Props> = ({
  isOpen,
  onClose,
  currentUser,
  onOpenAuth,
}) => {
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>('general');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: string; name: string; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Search filter for chat list & active chat
  const [channelSearchQuery, setChannelSearchQuery] = useState('');
  const [activeTabFilter, setActiveTabFilter] = useState<'all' | 'group' | 'channel' | 'support'>('all');
  const [msgSearchQuery, setMsgSearchQuery] = useState('');
  const [showMsgSearch, setShowMsgSearch] = useState(false);

  // User invite modal & search state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteInput, setInviteInput] = useState('');
  const [inviteType, setInviteType] = useState<'username' | 'email'>('username');
  const [invitedStatus, setInvitedStatus] = useState<string | null>(null);
  const [isCopyingLink, setIsCopyingLink] = useState(false);
  const [searchedUsers, setSearchedUsers] = useState<Array<{ id: string; name: string; email: string; avatar?: string }>>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [invitedUserIds, setInvitedUserIds] = useState<string[]>([]);
  const [inviteCooldown, setInviteCooldown] = useState<number>(() => {
    try {
      const savedEndTime = localStorage.getItem('chat_invite_cooldown_endtime');
      if (savedEndTime) {
        const diff = Math.ceil((parseInt(savedEndTime, 10) - Date.now()) / 1000);
        return diff > 0 ? diff : 0;
      }
    } catch {
      // ignore
    }
    return 0;
  });

  useEffect(() => {
    if (inviteCooldown <= 0) return;
    const timer = setInterval(() => {
      setInviteCooldown((prev) => {
        if (prev <= 1) {
          try {
            localStorage.removeItem('chat_invite_cooldown_endtime');
          } catch {}
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [inviteCooldown]);

  // Real-time or query search for registered users in Firestore
  useEffect(() => {
    if (!inviteInput.trim() || inviteInput.trim().length < 2) {
      setSearchedUsers([]);
      return;
    }

    const queryTerm = inviteInput.trim().toLowerCase().replace(/^@/, '');
    setIsSearchingUsers(true);

    const q = query(collection(db, 'users'), limit(10));
    getDocs(q)
      .then((snapshot) => {
        const list: Array<{ id: string; name: string; email: string; avatar?: string }> = [];
        snapshot.forEach((docSnap) => {
          const u = docSnap.data();
          const uName = (u.name || '').toLowerCase();
          const uEmail = (u.email || '').toLowerCase();
          if (uName.includes(queryTerm) || uEmail.includes(queryTerm)) {
            list.push({
              id: docSnap.id,
              name: u.name || 'Foydalanuvchi',
              email: u.email || '',
              avatar: u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(u.email || docSnap.id)}`,
            });
          }
        });
        setSearchedUsers(list);
        setIsSearchingUsers(false);
      })
      .catch((err) => {
        console.warn("User search query:", err);
        setIsSearchingUsers(false);
      });
  }, [inviteInput]);

  const handleSendInvite = async (targetUser?: { id: string; name: string; email: string; avatar?: string }) => {
    if (inviteCooldown > 0) {
      alert(`Qayta taklif yuborish uchun ${inviteCooldown} sekunt kuting!`);
      return;
    }

    let recipientUser: { id: string; name: string; email: string; avatar?: string } | undefined = targetUser;
    const inputVal = inviteInput.trim();
    if (!recipientUser && inputVal) {
      const found = searchedUsers.find(u => u.email.toLowerCase() === inputVal.toLowerCase() || u.name.toLowerCase() === inputVal.toLowerCase());
      if (found) {
        recipientUser = found;
      } else {
        try {
          const usersSnap = await getDocs(collection(db, 'users'));
          let matchedUser: any = null;
          usersSnap.forEach((docSnap) => {
            const data = docSnap.data();
            const dEmail = (data.email || '').toLowerCase();
            const dName = (data.name || '').toLowerCase();
            const qClean = inputVal.toLowerCase().replace(/^@/, '');
            if (dEmail === qClean || dName === qClean) {
              matchedUser = {
                id: docSnap.id,
                name: data.name || qClean,
                email: data.email || qClean,
                avatar: data.avatar,
              };
            }
          });
          if (matchedUser) {
            recipientUser = matchedUser;
          }
        } catch (e) {
          console.warn("Error querying users collection for invite:", e);
        }

        if (!recipientUser) {
          recipientUser = {
            id: `user_${Date.now()}`,
            name: inputVal.replace(/^@/, ''),
            email: inputVal.includes('@') ? inputVal : `${inputVal.replace(/^@/, '')}@example.com`,
          };
        }
      }
    }

    const recipient = recipientUser ? recipientUser.name : inputVal;
    if (!recipient) return;

    const inviteLink = `${window.location.origin}/?invite=${encodeURIComponent(currentUser?.id || 'guest')}`;

    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(inviteLink);
      }
    } catch (e) {
      // fallback
    }

    if (currentUser && selectedChannelId) {
      try {
        await addDoc(collection(db, 'messages'), {
          senderUid: currentUser.id,
          senderName: currentUser.name,
          senderEmail: currentUser.email,
          senderAvatar: currentUser.avatar,
          text: `🤝 Do'stimiz ${recipient} platformaga va chatga taklif qilindi! Taklif havolasi: ${inviteLink}`,
          createdAt: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
          timestamp: serverTimestamp(),
          channelId: selectedChannelId,
        });
      } catch (e) {
        console.warn("Message doc add invite notice:", e);
      }
    }

    if (recipientUser && currentUser) {
      try {
        const sEmail = (currentUser.email || '').toLowerCase();
        const rEmail = (recipientUser.email || '').toLowerCase();
        await addDoc(collection(db, 'chatRequests'), {
          senderUid: currentUser.id,
          senderName: currentUser.name,
          senderEmail: sEmail,
          senderAvatar: currentUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(sEmail || currentUser.id)}`,
          recipientId: recipientUser.id,
          recipientEmail: rEmail,
          recipientName: recipientUser.name,
          recipientAvatar: recipientUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(rEmail || recipientUser.id)}`,
          status: 'pending',
          createdAt: new Date().toISOString(),
          timestamp: serverTimestamp(),
        });
      } catch (e) {
        console.warn("Error adding chat request:", e);
      }
      setInvitedUserIds((prev) => [...prev, recipientUser.id]);
    }

    // Set 48 seconds cooldown
    setInviteCooldown(48);
    try {
      localStorage.setItem('chat_invite_cooldown_endtime', (Date.now() + 48000).toString());
    } catch {}

    setInvitedStatus(`Taklifnoma ${recipient} uchun yuborildi va taklif havolasi nusxalandi! (Qayta taklif uchun 48 sek kuting)`);
    setInviteInput('');
    setTimeout(() => setInvitedStatus(null), 5000);
  };

  const handleCopyMainInviteLink = async () => {
    const inviteLink = `${window.location.origin}/?invite=${encodeURIComponent(currentUser?.id || 'guest')}`;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(inviteLink);
      }
      setIsCopyingLink(true);
      setInvitedStatus("Taklif havolasi nusxalandi!");
      setTimeout(() => {
        setIsCopyingLink(false);
        setInvitedStatus(null);
      }, 3000);
    } catch (e) {
      setIsCopyingLink(true);
      setTimeout(() => setIsCopyingLink(false), 3000);
    }
  };

  const [activeReactionMsgId, setActiveReactionMsgId] = useState<string | null>(null);
  const [activeActionMsgId, setActiveActionMsgId] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const recordingTimeRef = useRef(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  // File attachment state
  const [selectedFile, setSelectedFile] = useState<{
    file: File;
    previewUrl: string;
    type: 'image' | 'video' | 'audio' | 'file';
    name: string;
    size: string;
    dataUrl: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);



  const isAdmin = currentUser
    ? currentUser.role === 'admin' || isAdminEmail(currentUser.email)
    : false;

  const processFileForUpload = (file: File): Promise<{ dataUrl: string; sizeFormatted: string; type: 'image' | 'video' | 'audio' | 'file' }> => {
    let type: 'image' | 'video' | 'audio' | 'file' = 'file';
    if (file.type.startsWith('image/')) type = 'image';
    else if (file.type.startsWith('video/')) type = 'video';
    else if (file.type.startsWith('audio/')) type = 'audio';

    if (type === 'image') {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          const rawUrl = e.target?.result as string;
          img.onload = () => {
            const maxDim = 1000;
            let width = img.width;
            let height = img.height;

            if (width > maxDim || height > maxDim) {
              if (width > height) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              } else {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
              const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.75);
              const approxBytes = Math.round((compressedDataUrl.length * 3) / 4);
              const sizeFormatted = approxBytes > 1024 * 1024
                ? `${(approxBytes / (1024 * 1024)).toFixed(1)} MB`
                : `${Math.round(approxBytes / 1024)} KB`;

              resolve({
                dataUrl: compressedDataUrl,
                sizeFormatted,
                type: 'image',
              });
              return;
            }
            resolve({
              dataUrl: rawUrl,
              sizeFormatted: `${Math.round(file.size / 1024)} KB`,
              type: 'image',
            });
          };
          img.onerror = () => {
            resolve({
              dataUrl: rawUrl,
              sizeFormatted: `${Math.round(file.size / 1024)} KB`,
              type: 'image',
            });
          };
          img.src = rawUrl;
        };
        reader.onerror = () => {
          resolve({
            dataUrl: '',
            sizeFormatted: '0 KB',
            type: 'image',
          });
        };
        reader.readAsDataURL(file);
      });
    } else {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result as string;
          const sizeFormatted = file.size > 1024 * 1024 
            ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
            : `${Math.round(file.size / 1024)} KB`;
          resolve({
            dataUrl,
            sizeFormatted,
            type,
          });
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const processed = await processFileForUpload(file);
      const approxBytes = Math.round((processed.dataUrl.length * 3) / 4);
      if (approxBytes > 850 * 1024) {
        if (processed.type === 'video') {
          alert("Video hajmi juda katta (maksimal ruxsat etilgan hajm 850KB). Iltimos, 10-20 soniyalik qisqa video fayl tanlang.");
        } else {
          alert("Fayl hajmi juda katta (maksimal ruxsat etilgan hajm 850KB). Iltimos, kichikroq fayl tanlang.");
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (videoInputRef.current) videoInputRef.current.value = '';
        return;
      }

      setSelectedFile({
        file,
        previewUrl: processed.dataUrl,
        type: processed.type,
        name: file.name,
        size: processed.sizeFormatted,
        dataUrl: processed.dataUrl,
      });
    } catch (err) {
      console.error("Faylni o'qishda xatolik:", err);
      alert("Faylni yuklab bo'lmadi.");
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  // Real-time listener for current selected chat channel
  useEffect(() => {
    if (!isOpen || !selectedChannelId) return;

    const q = query(
      collection(db, 'chatMessages'),
      orderBy('timestamp', 'asc'),
      limit(150)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: ChatMessage[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const docChannel = data.channelId || 'general';
          if (docChannel === selectedChannelId) {
            list.push({
              id: docSnap.id,
              senderUid: data.senderUid || '',
              senderName: data.senderName || 'Foydalanuvchi',
              senderEmail: data.senderEmail || '',
              senderAvatar: data.senderAvatar || '',
              text: data.text || '',
              createdAt: data.createdAt || new Date().toISOString(),
              timestamp: data.timestamp,
              channelId: docChannel,
              replyTo: data.replyTo || null,
              reactions: data.reactions || {},
              isAudio: data.isAudio || false,
              mediaUrl: data.mediaUrl || null,
              mediaType: data.mediaType || null,
              fileName: data.fileName || null,
              fileSize: data.fileSize || null,
              audioUrl: data.audioUrl || null,
              audioDuration: data.audioDuration || null,
            } as any);
          }
        });
        setMessages(list);
        setError(null);
      },
      (err) => {
        console.error('Realtime chat subscription error:', err);
        if (err.code === 'permission-denied') {
          setError('Suhbatni ko\'rish uchun tizimga kiring.');
        } else {
          setError('Xabarlarni yuklashda xatolik yuz berdi.');
        }
      }
    );

    return () => unsubscribe();
  }, [isOpen, selectedChannelId]);

  // Scroll to bottom
  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  useEffect(() => {
    if (selectedChannelId) {
      scrollToBottom(true);
    }
  }, [messages, selectedChannelId]);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    if (scrollHeight - scrollTop - clientHeight > 150) {
      setShowScrollBottom(true);
    } else {
      setShowScrollBottom(false);
    }
  };

  const handleSendMessage = async (
    e?: React.FormEvent,
    customText?: string,
    isAudioMsg = false,
    audioUrl?: string,
    audioDuration?: string
  ) => {
    if (e) e.preventDefault();
    const msgContent = customText || text;
    if (!msgContent.trim() && !selectedFile && !isAudioMsg) return;
    if (!selectedChannelId) return;

    if (!currentUser && !auth.currentUser) {
      onOpenAuth();
      return;
    }

    const senderUid = auth.currentUser?.uid || currentUser?.id || 'guest_user';
    const senderName = currentUser?.name || auth.currentUser?.displayName || 'Foydalanuvchi';
    const senderEmail = currentUser?.email || auth.currentUser?.email || '';
    const senderAvatar = currentUser?.avatar || auth.currentUser?.photoURL || '';

    const payload: any = {
      senderUid,
      senderName,
      senderEmail,
      senderAvatar,
      text: msgContent.trim(),
      createdAt: new Date().toISOString(),
      timestamp: serverTimestamp(),
      channelId: selectedChannelId,
      isAudio: isAudioMsg,
    };

    if (audioUrl) payload.audioUrl = audioUrl;
    if (audioDuration) payload.audioDuration = audioDuration;

    if (selectedFile) {
      payload.mediaUrl = selectedFile.dataUrl;
      payload.mediaType = selectedFile.type;
      payload.fileName = selectedFile.name;
      payload.fileSize = selectedFile.size;
    }

    if (replyTo) {
      payload.replyTo = {
        name: replyTo.name,
        text: replyTo.text,
      };
    }

    const jsonSize = JSON.stringify(payload).length;
    if (jsonSize > 950000) {
      alert("Fayl yoki xabar hajmi juda katta (Firestore 1MB hajmidan oshib ketgan). Iltimos, kichikroq fayl tanlang.");
      return;
    }

    setText('');
    setSelectedFile(null);
    setReplyTo(null);
    setShowEmojiPicker(false);
    setLoading(true);
    setError(null);

    try {
      await addDoc(collection(db, 'chatMessages'), payload);
      scrollToBottom(true);
    } catch (err: any) {
      console.error('Error sending message:', err);
      setError('Xabarni yuborishda xatolik yuz berdi.');
      setText(msgContent);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const startVoiceRecording = async () => {
    if (!currentUser && !auth.currentUser) {
      onOpenAuth();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      let mimeType = '';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        mimeType = 'audio/webm';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      } else if (MediaRecorder.isTypeSupported('audio/aac')) {
        mimeType = 'audio/aac';
      } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
        mimeType = 'audio/ogg';
      }

      const mediaRecorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(100);
      setIsRecordingVoice(true);
      setRecordingTime(0);
      recordingTimeRef.current = 0;

      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          const next = prev + 1;
          recordingTimeRef.current = next;
          return next;
        });
      }, 1000);
    } catch (err: any) {
      console.error('Mikrofon xatosi:', err);
      alert('Mikrofondan foydalanishga ruxsat berilmadi yoki xatolik yuz berdi: ' + (err.message || err));
    }
  };

  const stopAndSendVoiceRecording = () => {
    if (!mediaRecorderRef.current || !isRecordingVoice) return;

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    const durationSeconds = recordingTimeRef.current || recordingTime || 1;
    const minutes = Math.floor(durationSeconds / 60);
    const seconds = durationSeconds % 60;
    const durationStr = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

    const mediaRecorder = mediaRecorderRef.current;

    mediaRecorder.onstop = () => {
      const audioBlob = new Blob(audioChunksRef.current, {
        type: mediaRecorder.mimeType || 'audio/webm',
      });

      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }

      if (audioBlob.size === 0) {
        alert("Ovoz yozib olinmadi.");
        setIsRecordingVoice(false);
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Audio = reader.result as string;
        handleSendMessage(
          undefined,
          `🎤 Ovozli xabar (${durationStr})`,
          true,
          base64Audio,
          durationStr
        );
      };
      reader.readAsDataURL(audioBlob);
    };

    mediaRecorder.stop();
    setIsRecordingVoice(false);
  };

  const cancelVoiceRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = () => {
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((track) => track.stop());
          mediaStreamRef.current = null;
        }
      };
      mediaRecorderRef.current.stop();
    } else if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    setIsRecordingVoice(false);
    setRecordingTime(0);
  };

  const handleToggleReaction = async (msgId: string, emoji: string) => {
    if (!currentUser && !auth.currentUser) {
      onOpenAuth();
      return;
    }
    setActiveReactionMsgId(null);

    const msg = messages.find((m) => m.id === msgId);
    if (!msg) return;

    const currentReactions: Record<string, string[]> = (msg as any).reactions || {};
    const myUid = auth.currentUser?.uid || currentUser?.id || 'guest_user';

    const updated = { ...currentReactions };
    if (!updated[emoji]) updated[emoji] = [];

    if (updated[emoji].includes(myUid)) {
      updated[emoji] = updated[emoji].filter((uid) => uid !== myUid);
      if (updated[emoji].length === 0) delete updated[emoji];
    } else {
      Object.keys(updated).forEach((key) => {
        updated[key] = updated[key].filter((uid) => uid !== myUid);
        if (updated[key].length === 0) delete updated[key];
      });
      if (!updated[emoji]) updated[emoji] = [];
      updated[emoji].push(myUid);
    }

    // Optimistic local update
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === msgId) {
          return { ...m, reactions: updated } as any;
        }
        return m;
      })
    );

    try {
      await updateDoc(doc(db, 'chatMessages', msgId), {
        reactions: updated,
      });
    } catch (err) {
      console.error('Error adding reaction:', err);
    }
  };

  const handleDeleteMessage = async (msgId: string, msgSenderUid?: string, msgSenderEmail?: string) => {
    if (!currentUser && !auth.currentUser) {
      onOpenAuth();
      return;
    }

    const currentUid = auth.currentUser?.uid || currentUser?.id;
    const currentEmail = auth.currentUser?.email || currentUser?.email;
    const isOwner = Boolean(
      (currentUid && msgSenderUid === currentUid) ||
      (currentEmail && msgSenderEmail && currentEmail.toLowerCase() === msgSenderEmail.toLowerCase())
    );
    const isAdmin = Boolean(
      (currentEmail && isAdminEmail(currentEmail)) ||
      currentUser?.role === 'admin'
    );

    if (!isOwner && !isAdmin) {
      alert("Siz faqat o'zingiz yozgan xabarlarni o'chira olasiz.");
      return;
    }

    // Optimistic local removal
    setMessages((prev) => prev.filter((m) => m.id !== msgId));
    setActiveActionMsgId(null);
    setActiveReactionMsgId(null);

    try {
      await deleteDoc(doc(db, 'chatMessages', msgId));
    } catch (err: any) {
      console.error('Error deleting message:', err);
    }
  };

  const formatTime = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // Real-time live users map for resolving up-to-date user avatars and names
  const [usersMap, setUsersMap] = useState<Map<string, UserProfile>>(new Map());
  const [registeredUsersCount, setRegisteredUsersCount] = useState<number>(1);

  useEffect(() => {
    if (!isOpen) return;
    const unsubUsers = onSnapshot(
      collection(db, 'users'),
      (snap) => {
        setRegisteredUsersCount(Math.max(snap.docs.length, 1));
        const map = new Map<string, UserProfile>();
        snap.forEach((d) => {
          const u = { id: d.id, ...d.data() } as UserProfile;
          if (d.id) map.set(d.id, u);
          if (u.id) map.set(u.id, u);
          if (u.email) map.set(u.email.toLowerCase(), u);
        });
        setUsersMap(map);
      },
      (err) => console.warn("usersMap sub error:", err)
    );
    return () => unsubUsers();
  }, [isOpen]);

  // Real-time listener for latest messages across all chat channels
  const [latestMessagesMap, setLatestMessagesMap] = useState<Map<string, { text: string; time: string }>>(new Map());

  useEffect(() => {
    if (!isOpen) return;
    const q = query(
      collection(db, 'chatMessages'),
      orderBy('timestamp', 'desc'),
      limit(200)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const newMap = new Map<string, { text: string; time: string }>();
        snap.forEach((docSnap) => {
          const data = docSnap.data();
          const channelId = data.channelId || 'general';
          if (!newMap.has(channelId)) {
            let msgText = data.text || '';
            if (!msgText) {
              if (data.isAudio) msgText = '🎤 Ovozli xabar';
              else if (data.mediaType === 'image') msgText = '📷 Rasm';
              else if (data.mediaType === 'video') msgText = '🎥 Video';
              else if (data.fileName) msgText = '📁 Fayl';
            }
            let timeFormatted = '';
            if (data.createdAt) {
              try {
                const d = new Date(data.createdAt);
                timeFormatted = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              } catch {}
            }
            newMap.set(channelId, {
              text: msgText,
              time: timeFormatted,
            });
          }
        });
        setLatestMessagesMap(newMap);
      },
      (err) => console.warn("latestMessages sub error:", err)
    );
    return () => unsub();
  }, [isOpen]);

  // Accepted direct chat channels & pending incoming requests
  const [acceptedDirectChannels, setAcceptedDirectChannels] = useState<ChatChannel[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);

  // User custom aliases for direct chats (saved locally per user)
  const [customAliases, setCustomAliases] = useState<Record<string, string>>(() => {
    if (!currentUser) return {};
    try {
      const saved = localStorage.getItem(`custom_chat_aliases_${currentUser.id || currentUser.email}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Modal state for Pencil (Rename Alias) and Trash (Delete Chat)
  const [aliasModalData, setAliasModalData] = useState<{ channelId: string; name: string } | null>(null);
  const [aliasInputValue, setAliasInputValue] = useState('');

  const [deleteModalData, setDeleteModalData] = useState<{ channelId: string; name: string } | null>(null);
  const [isDeletingChat, setIsDeletingChat] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    try {
      const saved = localStorage.getItem(`custom_chat_aliases_${currentUser.id || currentUser.email}`);
      setCustomAliases(saved ? JSON.parse(saved) : {});
    } catch {
      setCustomAliases({});
    }
  }, [currentUser]);

  const handleOpenAliasModal = (channelId: string, name: string) => {
    const currentVal = customAliases[channelId] || name;
    setAliasInputValue(currentVal);
    setAliasModalData({ channelId, name });
  };

  const handleSaveAlias = () => {
    if (!aliasModalData) return;
    const channelId = aliasModalData.channelId;
    const trimmed = aliasInputValue.trim();
    const updated = { ...customAliases };
    if (trimmed) {
      updated[channelId] = trimmed;
    } else {
      delete updated[channelId];
    }
    setCustomAliases(updated);
    if (currentUser) {
      try {
        localStorage.setItem(`custom_chat_aliases_${currentUser.id || currentUser.email}`, JSON.stringify(updated));
      } catch (err) {
        console.warn("Error saving custom alias:", err);
      }
    }
    setAliasModalData(null);
  };

  const handleResetAlias = () => {
    if (!aliasModalData) return;
    const channelId = aliasModalData.channelId;
    const updated = { ...customAliases };
    delete updated[channelId];
    setCustomAliases(updated);
    if (currentUser) {
      try {
        localStorage.setItem(`custom_chat_aliases_${currentUser.id || currentUser.email}`, JSON.stringify(updated));
      } catch (err) {
        console.warn("Error saving custom alias:", err);
      }
    }
    setAliasModalData(null);
  };

  const handleOpenDeleteModal = (channelId: string, name: string) => {
    setDeleteModalData({ channelId, name });
  };

  const handleConfirmDeleteChat = async () => {
    if (!deleteModalData) return;
    const { channelId } = deleteModalData;
    if (!channelId.startsWith('dm_')) return;
    setIsDeletingChat(true);

    const reqDocId = channelId.replace('dm_', '');

    try {
      // Delete chatRequests document
      await deleteDoc(doc(db, 'chatRequests', reqDocId));

      // Delete all messages associated with channelId
      const msgSnap = await getDocs(query(collection(db, 'chatMessages'), where('channelId', '==', channelId)));
      const deletePromises = msgSnap.docs.map((d) => deleteDoc(d.ref));
      await Promise.all(deletePromises);

      // Clean local custom alias if exists
      const updatedAliases = { ...customAliases };
      delete updatedAliases[channelId];
      setCustomAliases(updatedAliases);
      if (currentUser) {
        try {
          localStorage.setItem(`custom_chat_aliases_${currentUser.id || currentUser.email}`, JSON.stringify(updatedAliases));
        } catch {}
      }

      // Optimistic local removal
      setAcceptedDirectChannels((prev) => prev.filter((ch) => ch.id !== channelId));
      if (selectedChannelId === channelId) {
        setSelectedChannelId(null);
      }
      setDeleteModalData(null);
    } catch (err) {
      console.error("Error deleting direct chat:", err);
      alert("Chatni o'chirishda xatolik yuz berdi.");
    } finally {
      setIsDeletingChat(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !currentUser) {
      setAcceptedDirectChannels([]);
      setPendingRequests([]);
      return;
    }

    const emailLower = (currentUser.email || '').toLowerCase();
    const uid = currentUser.id || '';

    const qRecipEmail = query(collection(db, 'chatRequests'), where('recipientEmail', '==', emailLower));
    const qRecipUid = query(collection(db, 'chatRequests'), where('recipientId', '==', uid));
    const qSenderEmail = query(collection(db, 'chatRequests'), where('senderEmail', '==', emailLower));
    const qSenderUid = query(collection(db, 'chatRequests'), where('senderUid', '==', uid));

    const queryResults = new Map<string, Map<string, any>>();

    const updateAll = () => {
      const combinedMap = new Map<string, any>();
      queryResults.forEach((subMap) => {
        subMap.forEach((val, key) => combinedMap.set(key, val));
      });
      const allDocs = Array.from(combinedMap.values());

      // 1. Pending requests where current user is recipient
      const pending = allDocs.filter(
        d => d.status === 'pending' &&
        (d.recipientEmail?.toLowerCase() === emailLower || d.recipientId === uid)
      );
      setPendingRequests(pending);

      // 2. Accepted DM channels
      const accepted = allDocs.filter(d => d.status === 'accepted');
      const channels: ChatChannel[] = accepted.map(data => {
        const isCurrentSender = (data.senderEmail?.toLowerCase() === emailLower) || (data.senderUid === uid);
        const otherName = isCurrentSender ? data.recipientName : data.senderName;
        const otherEmail = isCurrentSender ? data.recipientEmail : data.senderEmail;
        const otherUid = isCurrentSender ? data.recipientId : data.senderUid;
        const otherAvatarDoc = isCurrentSender ? data.recipientAvatar : data.senderAvatar;

        // Resolve live user profile from usersMap
        const liveUser = (otherUid && usersMap.get(otherUid)) || (otherEmail && usersMap.get(otherEmail.toLowerCase()));
        const realName = liveUser?.name || otherName;
        const avatarUrl = liveUser?.avatar || otherAvatarDoc || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(otherEmail || otherName || 'user')}`;

        const dmId = `dm_${data.id}`;
        const displayName = customAliases[dmId] || realName || 'Shaxsiy chat';

        return {
          id: dmId,
          name: displayName,
          description: `Shaxsiy suhbat: ${otherEmail}`,
          category: 'group',
          icon: <Users className="w-5.5 h-5.5 text-emerald-300 drop-shadow-xs" />,
          bgColor: 'bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-600',
          membersCount: 'Shaxsiy chat',
          isVerified: true,
          avatarUrl: avatarUrl,
        };
      });

      setAcceptedDirectChannels(channels);
    };

    const unsub1 = onSnapshot(qRecipEmail, (snap) => {
      const m = new Map<string, any>();
      snap.forEach(d => m.set(d.id, { id: d.id, ...d.data() }));
      queryResults.set('qRecipEmail', m);
      updateAll();
    }, (err) => console.warn("dm sub recip email:", err));

    const unsub2 = onSnapshot(qRecipUid, (snap) => {
      const m = new Map<string, any>();
      snap.forEach(d => m.set(d.id, { id: d.id, ...d.data() }));
      queryResults.set('qRecipUid', m);
      updateAll();
    }, (err) => console.warn("dm sub recip uid:", err));

    const unsub3 = onSnapshot(qSenderEmail, (snap) => {
      const m = new Map<string, any>();
      snap.forEach(d => m.set(d.id, { id: d.id, ...d.data() }));
      queryResults.set('qSenderEmail', m);
      updateAll();
    }, (err) => console.warn("dm sub sender email:", err));

    const unsub4 = onSnapshot(qSenderUid, (snap) => {
      const m = new Map<string, any>();
      snap.forEach(d => m.set(d.id, { id: d.id, ...d.data() }));
      queryResults.set('qSenderUid', m);
      updateAll();
    }, (err) => console.warn("dm sub sender uid:", err));

    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
    };
  }, [isOpen, currentUser, usersMap, customAliases]);

  // Filter channels in Chat List with real-time Firestore message previews and member counts
  const baseChannels = CHAT_CHANNELS.map((ch) => {
    const latestMsg = latestMessagesMap.get(ch.id);
    const realMembersCount = ch.id === 'general' ? `${registeredUsersCount} ta a'zo` : ch.membersCount;
    return {
      ...ch,
      membersCount: realMembersCount,
      lastMessageText: latestMsg ? latestMsg.text : "Hozircha xabar yo'q",
      lastMessageTime: latestMsg ? latestMsg.time : '',
    };
  });

  const mappedDirectChannels = acceptedDirectChannels.map((ch) => {
    const latestMsg = latestMessagesMap.get(ch.id);
    return {
      ...ch,
      lastMessageText: latestMsg ? latestMsg.text : "Hozircha xabar yo'q",
      lastMessageTime: latestMsg ? latestMsg.time : '',
    };
  });

  const allChannels = [...baseChannels, ...mappedDirectChannels];
  const activeChannel = allChannels.find((c) => c.id === selectedChannelId);
  const filteredChannels = allChannels.filter((ch) => {
    if (activeTabFilter !== 'all' && ch.category !== activeTabFilter) return false;
    if (!channelSearchQuery.trim()) return true;
    const q = channelSearchQuery.toLowerCase();
    return ch.name.toLowerCase().includes(q) || ch.description.toLowerCase().includes(q);
  });

  // Filter messages in selected active chat
  const filteredMessages = messages.filter((m) => {
    if (!msgSearchQuery.trim()) return true;
    const q = msgSearchQuery.toLowerCase();
    return m.text.toLowerCase().includes(q) || m.senderName.toLowerCase().includes(q);
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-fade-in">
      <div
        className={`bg-[#E6EBEF] w-full ${
          isExpanded ? 'max-w-4xl h-[92vh]' : 'max-w-lg h-[88vh] sm:h-[680px]'
        } rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-300 flex flex-col overflow-hidden transition-all duration-300 relative font-sans`}
      >
        {/* ================= VIEW 1: CHAT CHANNELS LIST (CHATLAR RO'YXATI) ================= */}
        {!selectedChannelId ? (
          <div className="flex flex-col h-full bg-white">
            {/* Telegram List Header */}
            <div className="bg-[#3390EC] text-white p-3.5 sm:p-4 flex items-center justify-between shadow-md shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center text-white">
                  <MessageSquare className="w-5 h-5 fill-white/20" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg tracking-tight">Chatlar</h3>
                  <p className="text-[11px] text-sky-100">UniTest Telegram Uslubidagi Chatlar</p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-2 text-sky-100 hover:text-white hover:bg-white/10 rounded-full transition hidden sm:block"
                  title={isExpanded ? 'Kichiklashtirish' : 'Kattalashtirish'}
                >
                  {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
                <button
                  onClick={onClose}
                  className="p-2 text-sky-100 hover:text-white hover:bg-white/10 rounded-full transition active:scale-95"
                  title="Yopish"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Search Input Bar */}
            <div className="p-3 bg-slate-50 border-b border-slate-200 shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={channelSearchQuery}
                  onChange={(e) => setChannelSearchQuery(e.target.value)}
                  placeholder="Chat va guruhlardan qidirish..."
                  className="w-full bg-white text-xs pl-9 pr-8 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#3390EC] transition"
                />
                {channelSearchQuery && (
                  <button
                    onClick={() => setChannelSearchQuery('')}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Category Tabs */}
              <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto scrollbar-none text-[11px] font-bold">
                <button
                  onClick={() => setActiveTabFilter('all')}
                  className={`px-3 py-1 rounded-lg transition shrink-0 ${
                    activeTabFilter === 'all'
                      ? 'bg-[#3390EC] text-white shadow-2xs'
                      : 'bg-slate-200/70 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Barchasi
                </button>
                <button
                  onClick={() => setActiveTabFilter('group')}
                  className={`px-3 py-1 rounded-lg transition shrink-0 ${
                    activeTabFilter === 'group'
                      ? 'bg-[#3390EC] text-white shadow-2xs'
                      : 'bg-slate-200/70 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Guruhlar
                </button>
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="px-3 py-1 rounded-lg transition shrink-0 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/80 flex items-center gap-1 font-bold"
                  title="Do'stlarni username va email orqali taklif qilish"
                >
                  <UserPlus className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Do'stlarni taklif qilish</span>
                </button>
              </div>
            </div>

            {/* Chat List Items Stream */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {!currentUser && (
                <div className="p-3 bg-amber-50/80 border-b border-amber-200 text-xs text-amber-900 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Chatda yozish uchun akkauntingizga kiring.</span>
                  </div>
                  <button
                    onClick={onOpenAuth}
                    className="bg-amber-600 text-white font-bold px-2.5 py-1 rounded-lg text-xs"
                  >
                    Kirish
                  </button>
                </div>
              )}

              {/* Pending Incoming Invitations Section */}
              {pendingRequests.length > 0 && (
                <div className="p-3 bg-gradient-to-r from-sky-50 via-teal-50 to-emerald-50 border-b border-sky-200/80 animate-fade-in space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-sky-900 flex items-center gap-1.5">
                      <MessageSquare className="w-4 h-4 text-sky-600" />
                      <span>Sizga kelgan chat takliflari ({pendingRequests.length})</span>
                    </span>
                    <span className="text-[10px] font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full animate-pulse">
                      Yangi taklif!
                    </span>
                  </div>

                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {pendingRequests.map((req) => {
                      const senderUser = (req.senderUid && usersMap.get(req.senderUid)) || (req.senderEmail && usersMap.get(req.senderEmail.toLowerCase()));
                      const senderAvatar = senderUser?.avatar || req.senderAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(req.senderEmail || req.senderName)}`;
                      const senderName = senderUser?.name || req.senderName;

                      return (
                        <div key={req.id} className="bg-white p-2.5 rounded-xl border border-sky-200 shadow-2xs flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <img
                              src={senderAvatar}
                              alt={senderName}
                              className="w-8 h-8 rounded-full object-cover bg-slate-100 shrink-0 border border-sky-300"
                            />
                            <div className="min-w-0">
                              <div className="font-extrabold text-xs text-slate-800 truncate">{senderName}</div>
                              <div className="text-[10px] text-slate-500 truncate">{req.senderEmail}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await updateDoc(doc(db, 'chatRequests', req.id), { status: 'accepted' });
                                setSelectedChannelId(`dm_${req.id}`);
                              } catch (err) {
                                console.warn("Accept request error:", err);
                              }
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-extrabold px-2.5 py-1 rounded-lg shadow-2xs transition flex items-center gap-1 active:scale-95"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Qabul</span>
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await updateDoc(doc(db, 'chatRequests', req.id), { status: 'declined' });
                              } catch (err) {
                                console.warn("Decline request error:", err);
                              }
                            }}
                            className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-[11px] font-extrabold px-2 py-1 rounded-lg transition active:scale-95"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  </div>
                </div>
              )}

              {filteredChannels.map((ch) => (
                <div
                  key={ch.id}
                  onClick={() => setSelectedChannelId(ch.id)}
                  className="p-3.5 hover:bg-slate-50 cursor-pointer transition flex items-center gap-3 active:bg-slate-100 group"
                >
                  {/* Avatar Icon / Image */}
                  {ch.avatarUrl ? (
                    <img
                      src={ch.avatarUrl}
                      alt={ch.name}
                      className="w-12 h-12 rounded-full object-cover shrink-0 shadow-xs border border-slate-200 group-hover:scale-105 transition bg-slate-100"
                    />
                  ) : (
                    <div
                      className={`w-12 h-12 rounded-full ${ch.bgColor} flex items-center justify-center shrink-0 shadow-sm text-white group-hover:scale-105 transition`}
                    >
                      {ch.icon}
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <h4 className="font-extrabold text-sm text-slate-800 truncate flex items-center gap-1">
                        <span>{ch.name}</span>
                        {ch.isVerified && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#3390EC] fill-[#3390EC]/10 shrink-0" />
                        )}
                      </h4>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {ch.id.startsWith('dm_') && (
                          <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200/80 z-10">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenAliasModal(ch.id, ch.name);
                              }}
                              className="p-1.5 text-slate-500 hover:text-[#3390EC] hover:bg-white rounded-md transition active:scale-95 cursor-pointer"
                              title="Nomni faqat o'zingiz uchun o'zgartirish (Qalamcha)"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDeleteModal(ch.id, ch.name);
                              }}
                              className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-white rounded-md transition active:scale-95 cursor-pointer"
                              title="Shaxsiy chatni va xabarlarni butunlay o'chirish (Axlat chelagi)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                        <span className="text-[11px] text-slate-400 font-medium shrink-0">
                          {ch.lastMessageTime}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-500 truncate">{ch.lastMessageText || ch.description}</p>

                    <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400 font-semibold">
                      <span>{ch.membersCount}</span>
                      {ch.unreadCount && (
                        <span className="bg-[#3390EC] text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                          {ch.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* ================= VIEW 2: ACTIVE SELECTED CHAT ROOM (CHAT XONASI) ================= */
          <div className="flex flex-col h-full">
            {/* Top Telegram Header with Back Arrow */}
            <div className="bg-[#3390EC] text-white p-2.5 sm:px-4 flex items-center justify-between shadow-md shrink-0 z-20">
              <div className="flex items-center gap-2.5 min-w-0">
                <button
                  onClick={() => setSelectedChannelId(null)}
                  className="p-1.5 hover:bg-white/10 rounded-full transition text-white active:scale-95 shrink-0"
                  title="Chatlar ro'yxatiga qaytish"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                {activeChannel?.avatarUrl ? (
                  <img
                    src={activeChannel.avatarUrl}
                    alt={activeChannel.name}
                    className="w-9 h-9 rounded-full object-cover shrink-0 ring-2 ring-white/30 bg-slate-100"
                  />
                ) : (
                  <div
                    className={`w-9 h-9 rounded-full ${activeChannel?.bgColor || 'bg-blue-600'} flex items-center justify-center text-white shrink-0 ring-2 ring-white/30`}
                  >
                    {activeChannel?.icon}
                  </div>
                )}

                <div className="min-w-0">
                  <h3 className="font-extrabold text-sm sm:text-base tracking-tight truncate flex items-center gap-1">
                    <span>{activeChannel?.name}</span>
                    {activeChannel?.isVerified && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-sky-200 fill-white shrink-0" />
                    )}
                  </h3>
                  <p className="text-[11px] text-sky-100 opacity-90 truncate">
                    {activeChannel?.membersCount || 'Jonli chat'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {activeChannel?.id.startsWith('dm_') && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleOpenAliasModal(activeChannel.id, activeChannel.name)}
                      className="p-1.5 text-sky-100 hover:text-white hover:bg-white/10 rounded-full transition cursor-pointer"
                      title="Nomni faqat o'zingiz uchun o'zgartirish (Qalamcha)"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenDeleteModal(activeChannel.id, activeChannel.name)}
                      className="p-1.5 text-sky-100 hover:text-red-200 hover:bg-red-500/20 rounded-full transition cursor-pointer"
                      title="Shaxsiy chatni va barcha xabarlarni butunlay o'chirish (Axlat chelagi)"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
                <button
                  onClick={() => setShowMsgSearch(!showMsgSearch)}
                  className={`p-2 rounded-full transition ${
                    showMsgSearch
                      ? 'bg-white/20 text-white'
                      : 'text-sky-100 hover:text-white hover:bg-white/10'
                  }`}
                  title="Qidirish"
                >
                  <Search className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-2 text-sky-100 hover:text-white hover:bg-white/10 rounded-full transition hidden sm:block"
                  title={isExpanded ? 'Kichiklashtirish' : 'Kattalashtirish'}
                >
                  {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
                <button
                  onClick={onClose}
                  className="p-2 text-sky-100 hover:text-white hover:bg-white/10 rounded-full transition active:scale-95"
                  title="Yopish"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Message Search Bar */}
            {showMsgSearch && (
              <div className="bg-white border-b border-slate-200 px-3 py-2 flex items-center gap-2 z-10 animate-fade-in shadow-xs">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={msgSearchQuery}
                  onChange={(e) => setMsgSearchQuery(e.target.value)}
                  placeholder="Ushbu chatdan xabar qidirish..."
                  className="w-full bg-slate-50 text-xs px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-[#3390EC]"
                  autoFocus
                />
                {msgSearchQuery && (
                  <button
                    onClick={() => setMsgSearchQuery('')}
                    className="text-slate-400 hover:text-slate-600 p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* Telegram Wallpaper Message Stream */}
            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="flex-1 bg-[#8BB5DA]/20 p-3 sm:p-4 overflow-y-auto space-y-2.5 relative bg-[radial-gradient(#2481CC_0.75px,transparent_0.75px)] [background-size:16px_16px]"
            >
              {error && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-2xl text-xs flex items-center gap-2 shadow-sm">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {!currentUser && (
                <div className="bg-white/95 border border-sky-200 p-3 rounded-2xl text-xs flex items-center justify-between gap-3 text-slate-800 shadow-sm my-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>Xabar yozish uchun akkauntingizga kiring.</span>
                  </div>
                  <button
                    onClick={onOpenAuth}
                    className="bg-[#3390EC] hover:bg-[#2481CC] text-white font-bold px-3 py-1.5 rounded-xl transition text-xs shrink-0 flex items-center gap-1 active:scale-95 shadow-xs"
                  >
                    <LogIn className="w-3.5 h-3.5" /> Kirish
                  </button>
                </div>
              )}

              {filteredMessages.length === 0 && !error && (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-2">
                  <div className="w-16 h-16 rounded-full bg-white text-[#3390EC] flex items-center justify-center shadow-sm">
                    <Send className="w-7 h-7 -translate-x-0.5 translate-y-0.5" />
                  </div>
                  <p className="font-bold text-slate-800 text-sm">
                    {msgSearchQuery ? "Ushbu so'rov bo'yicha xabar topilmadi" : "Hozircha xabarlar yo'q"}
                  </p>
                  <p className="text-xs max-w-xs text-slate-600">
                    Birinchi bo'lib ushbu chatda xabar qoldiring!
                  </p>
                </div>
              )}

              {filteredMessages.map((msg) => {
                const currentUid = auth.currentUser?.uid || currentUser?.id;
                const currentEmail = auth.currentUser?.email || currentUser?.email;
                const isMe = Boolean(
                  (currentUid && msg.senderUid === currentUid) ||
                  (currentEmail && msg.senderEmail && currentEmail.toLowerCase() === msg.senderEmail.toLowerCase())
                );
                const isMsgAdmin = isAdminEmail(msg.senderEmail);
                const msgReactions: Record<string, string[]> = (msg as any).reactions || {};
                const isAudio = (msg as any).isAudio;
                const replyData = (msg as any).replyTo;

                const senderUser = (msg.senderUid && usersMap.get(msg.senderUid)) || (msg.senderEmail && usersMap.get(msg.senderEmail.toLowerCase()));
                const displayAvatar = senderUser?.avatar || msg.senderAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(msg.senderName || 'user')}`;
                const displayName = senderUser?.name || msg.senderName;

                return (
                  <div
                    key={msg.id}
                    className={`flex gap-2 max-w-[88%] sm:max-w-[78%] ${
                      isMe ? 'ml-auto flex-row-reverse' : 'mr-auto'
                    }`}
                  >
                    {!isMe && (
                      <img
                        src={displayAvatar}
                        alt={displayName}
                        className="w-7 h-7 rounded-full border border-slate-200 object-cover shrink-0 mt-auto shadow-2xs bg-white"
                      />
                    )}

                    <div className={`flex flex-col relative group ${isMe ? 'items-end' : 'items-start'}`}>
                      {/* Sender Name */}
                      {!isMe && (
                        <div className="flex items-center gap-1.5 px-2 mb-0.5 text-[11px] font-bold text-[#2481CC]">
                          <span>{msg.senderName}</span>
                          {isMsgAdmin && (
                            <span className="bg-amber-100 text-amber-800 text-[9px] font-extrabold px-1.5 py-0.2 rounded-md border border-amber-300 flex items-center gap-0.5">
                              <ShieldCheck className="w-2.5 h-2.5" /> Admin
                            </span>
                          )}
                        </div>
                      )}

                      {/* Telegram Bubble */}
                      <div
                        onClick={() => setActiveActionMsgId(activeActionMsgId === msg.id ? null : msg.id)}
                        className={`relative px-3 py-2 rounded-2xl text-xs sm:text-sm leading-relaxed break-words shadow-xs transition-all cursor-pointer ${
                          isMe
                            ? 'bg-[#EEFFDE] border border-[#D2F1B2] text-slate-900 rounded-tr-xs'
                            : 'bg-white text-slate-900 rounded-tl-xs'
                        }`}
                      >
                        {/* Reply Preview */}
                        {replyData && (
                          <div className="mb-1.5 p-1.5 pl-2.5 bg-black/5 rounded-r-lg border-l-3 border-[#3390EC] text-xs">
                            <div className="font-bold text-[#2481CC] text-[11px]">{replyData.name}</div>
                            <div className="text-slate-600 line-clamp-1 italic text-[11px]">{replyData.text}</div>
                          </div>
                        )}

                        {/* Media / File attachment display */}
                        {(msg as any).mediaUrl && (
                          <div className="my-1.5 overflow-hidden rounded-xl">
                            {(msg as any).mediaType === 'image' && (
                              <img
                                src={(msg as any).mediaUrl}
                                alt={(msg as any).fileName || 'Rasm'}
                                className="max-w-xs sm:max-w-sm max-h-72 rounded-xl object-cover cursor-pointer hover:opacity-95 transition shadow-2xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const w = window.open('');
                                  if (w) w.document.write(`<body style="margin:0;background:#111;display:flex;align-items:center;justify-content:center;height:100vh;"><img src="${(msg as any).mediaUrl}" style="max-width:100%;max-height:100vh;object-fit:contain;" /></body>`);
                                }}
                              />
                            )}
                            {(msg as any).mediaType === 'video' && (
                              <video
                                src={(msg as any).mediaUrl}
                                controls
                                className="max-w-xs sm:max-w-sm max-h-72 rounded-xl object-cover shadow-2xs"
                                onClick={(e) => e.stopPropagation()}
                              />
                            )}
                            {((msg as any).mediaType === 'file' || (msg as any).mediaType === 'audio') && (
                              <a
                                href={(msg as any).mediaUrl}
                                download={(msg as any).fileName || 'fayl'}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-2.5 p-2.5 bg-black/5 hover:bg-black/10 rounded-xl transition group/file text-left min-w-[200px]"
                              >
                                <div className="w-10 h-10 rounded-lg bg-[#3390EC] text-white flex items-center justify-center shrink-0 shadow-2xs group-hover/file:scale-105 transition">
                                  <FileText className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0 pr-1">
                                  <div className="font-bold text-slate-800 text-xs truncate">
                                    {(msg as any).fileName || 'Fayl'}
                                  </div>
                                  <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                                    <span>{(msg as any).fileSize || 'Fayl'}</span>
                                    <span>•</span>
                                    <span className="text-[#3390EC] flex items-center gap-0.5 font-semibold">
                                      <Download className="w-3 h-3" /> Yuklab olish
                                    </span>
                                  </div>
                                </div>
                              </a>
                            )}
                          </div>
                        )}

                        {/* Audio Note Representation */}
                        {isAudio ? (
                          <AudioMessagePlayer
                            audioUrl={(msg as any).audioUrl}
                            durationStr={(msg as any).audioDuration || '0:05'}
                            isMe={isMe}
                          />
                        ) : (
                          msg.text && !['📷 Rasm', '🎥 Video', '🎵 Ovozli fayl', 'Rasm', 'Video'].includes(msg.text.trim()) && (
                            <p className="whitespace-pre-wrap pr-12 mt-1">{msg.text}</p>
                          )
                        )}

                        {/* Time & Checkmarks */}
                        <div className="float-right ml-2 -mb-1 mt-0.5 flex items-center gap-1 text-[10px] text-slate-400 font-medium select-none">
                          <span>{formatTime(msg.createdAt)}</span>
                          {isMe && <CheckCheck className="w-3.5 h-3.5 text-[#3390EC]" />}
                        </div>

                        {/* Reactions Bar Display */}
                        {Object.keys(msgReactions).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5 pt-1 border-t border-slate-200/50">
                            {Object.entries(msgReactions).map(([emoji, uids]) => (
                              <button
                                key={emoji}
                                onClick={() => handleToggleReaction(msg.id, emoji)}
                                className={`px-1.5 py-0.5 rounded-full text-[11px] border flex items-center gap-1 transition ${
                                  currentUser && uids.includes(currentUser.uid)
                                    ? 'bg-sky-100 border-sky-300 text-sky-800 font-bold'
                                    : 'bg-slate-50 border-slate-200 text-slate-700'
                                }`}
                              >
                                <span>{emoji}</span>
                                <span className="text-[10px]">{uids.length}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Hover / Tap controls */}
                      <div
                        className={`absolute -top-3 ${
                          isMe ? '-left-2' : '-right-2'
                        } ${
                          activeActionMsgId === msg.id || activeReactionMsgId === msg.id ? 'flex' : 'hidden group-hover:flex'
                        } items-center gap-1 bg-white shadow-md border border-slate-200 rounded-full px-1.5 py-0.5 z-20 transition animate-fade-in`}
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveReactionMsgId(activeReactionMsgId === msg.id ? null : msg.id);
                          }}
                          className="p-1 hover:bg-amber-50 rounded-full text-amber-500 transition active:scale-90"
                          title="Reaksiya bildirish"
                        >
                          <Smile className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setReplyTo({ id: msg.id, name: msg.senderName, text: msg.text });
                            inputRef.current?.focus();
                          }}
                          className="p-1 hover:bg-sky-50 rounded-full text-[#3390EC] transition active:scale-90"
                          title="Javob qaytarish"
                        >
                          <Reply className="w-3.5 h-3.5" />
                        </button>

                        {(isMe || (currentUser?.email && isAdminEmail(currentUser.email)) || currentUser?.role === 'admin') && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteMessage(msg.id, msg.senderUid, msg.senderEmail);
                            }}
                            className="p-1 hover:bg-rose-50 rounded-lg text-rose-600 border border-slate-200 transition active:scale-90 flex items-center justify-center"
                            title="Xabarni o'chirish"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                          </button>
                        )}
                      </div>

                      {/* Reaction Drawer */}
                      {activeReactionMsgId === msg.id && (
                        <div
                          className={`absolute -top-10 ${
                            isMe ? 'right-0' : 'left-0'
                          } bg-white border border-slate-200 shadow-xl rounded-full px-2 py-1 flex items-center gap-1 z-30 animate-scale-up`}
                        >
                          {TELEGRAM_REACTIONS.map((emoji) => (
                            <button
                              key={emoji}
                              onClick={() => handleToggleReaction(msg.id, emoji)}
                              className="hover:scale-125 transition text-base p-0.5"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Scroll Bottom Button */}
            {showScrollBottom && (
              <button
                onClick={() => scrollToBottom(true)}
                className="absolute bottom-20 right-4 bg-white hover:bg-slate-50 text-[#3390EC] border border-slate-300 p-2.5 rounded-full shadow-lg z-20 transition active:scale-95 animate-bounce"
                title="Pastga tushish"
              >
                <ArrowDown className="w-4 h-4" />
              </button>
            )}

            {/* Reply Banner */}
            {replyTo && (
              <div className="bg-white border-t border-slate-200 px-3 py-2 flex items-center justify-between gap-2 text-xs text-slate-800 shrink-0 z-10 shadow-2xs">
                <div className="flex items-center gap-2 min-w-0 border-l-3 border-[#3390EC] pl-2">
                  <Reply className="w-4 h-4 text-[#3390EC] shrink-0" />
                  <div className="truncate">
                    <div className="font-bold text-[#2481CC] text-[11px]">{replyTo.name} ga javob:</div>
                    <div className="text-slate-500 truncate italic text-[11px]">{replyTo.text}</div>
                  </div>
                </div>
                <button
                  onClick={() => setReplyTo(null)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Emoji Drawer */}
            {showEmojiPicker && (
              <div className="bg-white border-t border-slate-200 p-2 flex flex-wrap gap-2 justify-center shrink-0 z-10 animate-fade-in">
                {TELEGRAM_REACTIONS.concat(['😊', '🙋‍♂️', '🎓', '📚', '✅', '❌', '💡', '🏆', '🎉']).map(
                  (e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => setText((prev) => prev + e)}
                      className="text-lg p-1.5 hover:bg-slate-100 rounded-lg transition"
                    >
                      {e}
                    </button>
                  )
                )}
              </div>
            )}

            {/* Selected File Attachment Banner */}
            {selectedFile && (
              <div className="px-3 py-2 bg-sky-50 border-t border-sky-100 flex items-center justify-between gap-2 shrink-0 animate-fade-in z-10">
                <div className="flex items-center gap-2.5 min-w-0">
                  {selectedFile.type === 'image' ? (
                    <img
                      src={selectedFile.previewUrl}
                      alt="Preview"
                      className="w-10 h-10 rounded-lg object-cover border border-sky-200 shrink-0 shadow-2xs"
                    />
                  ) : selectedFile.type === 'video' ? (
                    <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-sky-300 bg-slate-900 shrink-0 shadow-2xs flex items-center justify-center">
                      <video src={selectedFile.previewUrl} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Video className="w-4 h-4 text-white drop-shadow-md" />
                      </div>
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-sky-200 text-sky-800 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-800 truncate">{selectedFile.name}</div>
                    <div className="text-[10px] text-slate-500 font-medium">{selectedFile.size}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition"
                  title="Biriktirmani o'chirish"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Input Bar */}
            {isRecordingVoice ? (
              <div className="p-2.5 bg-rose-50 border-t border-rose-200 flex items-center justify-between gap-3 shrink-0 z-20 animate-fade-in">
                <div className="flex items-center gap-2.5 text-rose-700 font-medium text-xs sm:text-sm">
                  <span className="w-3 h-3 rounded-full bg-rose-600 animate-ping shrink-0" />
                  <span>Ovoz yozilmoqda...</span>
                  <span className="font-mono bg-rose-100 px-2.5 py-0.5 rounded-md text-rose-800 font-bold">
                    {Math.floor(recordingTime / 60)}:{recordingTime % 60 < 10 ? '0' : ''}{recordingTime % 60}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={cancelVoiceRecording}
                    className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-100 rounded-full transition"
                    title="Bekor qilish"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  <button
                    type="button"
                    onClick={stopAndSendVoiceRecording}
                    className="bg-rose-600 hover:bg-rose-700 text-white p-2.5 rounded-full flex items-center justify-center shadow-md shadow-rose-600/30 transition active:scale-95 shrink-0"
                    title="Yuborish"
                  >
                    <Send className="w-4 h-4 -translate-x-0.5" />
                  </button>
                </div>
              </div>
            ) : (
              <form
                onSubmit={handleSendMessage}
                className="p-2.5 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0 z-20"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="image/*,video/*,audio/*,application/*,text/*,.pdf,.doc,.docx,.xls,.xlsx,.zip"
                  className="hidden"
                />
                <input
                  type="file"
                  ref={videoInputRef}
                  onChange={handleFileSelect}
                  accept="video/*"
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className={`p-2 rounded-full transition ${
                    showEmojiPicker ? 'text-[#3390EC] bg-sky-50' : 'text-slate-400 hover:text-slate-600'
                  }`}
                  title="Smayliklar"
                >
                  <Smile className="w-5 h-5" />
                </button>

                <button
                  type="button"
                  onClick={() => videoInputRef.current?.click()}
                  className={`p-2 rounded-full transition ${
                    selectedFile?.type === 'video' ? 'text-[#3390EC] bg-sky-100' : 'text-slate-400 hover:text-[#3390EC] hover:bg-sky-50'
                  }`}
                  title="Video yuborish"
                >
                  <Video className="w-5 h-5" />
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`p-2 rounded-full transition ${
                    selectedFile && selectedFile.type !== 'video' ? 'text-[#3390EC] bg-sky-100' : 'text-slate-400 hover:text-[#3390EC] hover:bg-sky-50'
                  }`}
                  title="Rasm yoki fayl biriktirish"
                >
                  <Paperclip className="w-5 h-5" />
                </button>

                <input
                  ref={inputRef}
                  type="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={
                    selectedFile
                      ? 'Tavsif yozing (ixtiyoriy)...'
                      : currentUser
                      ? 'Xabar yozing...'
                      : 'Yozish uchun avval tizimga kiring...'
                  }
                  maxLength={600}
                  className="flex-1 bg-slate-100/90 border border-transparent focus:border-[#3390EC] focus:bg-white focus:outline-none px-3.5 py-2 rounded-2xl text-xs sm:text-sm text-slate-800 transition"
                />

                <button
                  type="submit"
                  disabled={loading || (!text.trim() && !selectedFile)}
                  className={`p-2.5 rounded-full flex items-center justify-center transition shrink-0 ${
                    text.trim() || selectedFile
                      ? 'bg-[#3390EC] hover:bg-[#2481CC] text-white shadow-md shadow-sky-500/20 active:scale-95'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                  }`}
                  title="Yuborish"
                >
                  <Send className="w-4 h-4 -translate-x-0.5" />
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Invite Friends Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh] transform transition-all scale-100">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-600 p-5 text-white flex items-center justify-between relative">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
                  <UserPlus className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base leading-tight">Do'stlarni taklif qilish</h3>
                  <p className="text-xs text-emerald-100 font-medium">Username va email orqali taklif qiling</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowInviteModal(false);
                  setInviteInput('');
                  setInvitedStatus(null);
                }}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4">
              {/* Notification / Toast Banner */}
              {invitedStatus && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-3 rounded-2xl flex items-center gap-2 animate-fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-bold">{invitedStatus}</span>
                </div>
              )}

              {/* Copy Shareable Invite Link */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Shaxsiy taklif havolangiz</span>
                  </span>
                  <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-100/60 px-2 py-0.5 rounded-full">
                    Tayyor havola
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/?invite=${encodeURIComponent(currentUser?.id || 'guest')}`}
                    className="flex-1 bg-white text-slate-600 text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none font-mono selection:bg-emerald-100"
                  />
                  <button
                    type="button"
                    onClick={handleCopyMainInviteLink}
                    className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition shrink-0 ${
                      isCopyingLink
                        ? 'bg-emerald-600 text-white'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                    }`}
                  >
                    {isCopyingLink ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Nusxalandi</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Nusxalash</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Invite Type Switcher */}
              <div className="space-y-2">
                <label className="text-xs font-extrabold text-slate-700 block">
                  Foydalanuvchini izlash va taklif yuborish
                </label>
                <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setInviteType('username')}
                    className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition ${
                      inviteType === 'username'
                        ? 'bg-white text-emerald-700 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <AtSign className="w-3.5 h-3.5" />
                    <span>Username (@foydalanuvchi)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInviteType('email')}
                    className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition ${
                      inviteType === 'email'
                        ? 'bg-white text-emerald-700 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Email manzil</span>
                  </button>
                </div>

                {/* Input */}
                <div className="relative">
                  <input
                    type="text"
                    value={inviteInput}
                    onChange={(e) => setInviteInput(e.target.value)}
                    placeholder={
                      inviteType === 'username'
                        ? 'Username kiriting (masalan: @alisher)...'
                        : 'Email manzilini kiriting (masalan: alisher@gmail.com)...'
                    }
                    className="w-full bg-white text-xs pl-9 pr-24 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 font-medium transition"
                  />
                  <div className="absolute left-3 top-3 text-slate-400">
                    {inviteType === 'username' ? (
                      <AtSign className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Mail className="w-4 h-4 text-emerald-600" />
                    )}
                  </div>

                  {inviteInput.trim() && (
                    <button
                      type="button"
                      disabled={inviteCooldown > 0}
                      onClick={() => handleSendInvite()}
                      className={`absolute right-1.5 top-1.5 text-xs font-extrabold px-3 py-1.5 rounded-lg shadow-xs transition flex items-center gap-1 ${
                        inviteCooldown > 0
                          ? 'bg-slate-300 text-slate-600 cursor-not-allowed'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      }`}
                    >
                      <Send className="w-3 h-3" />
                      <span>{inviteCooldown > 0 ? `${inviteCooldown}s kuting` : 'Taklif etish'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Found Users List */}
              {inviteInput.trim().length >= 2 && (
                <div className="space-y-2 pt-1">
                  <h4 className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                    <span>Tizimdan topilgan foydalanuvchilar</span>
                    {isSearchingUsers && <span className="animate-pulse text-emerald-600">Qidirilmoqda...</span>}
                  </h4>

                  {searchedUsers.length === 0 && !isSearchingUsers ? (
                    <div className="p-4 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-500">
                      <p className="font-semibold text-slate-700">Tizimda bu nomli foydalanuvchi topilmadi</p>
                      <p className="text-[11px] mt-1 text-slate-400">
                        Yuqoridagi "Taklif etish" tugmasini bossangiz, shaxsiy taklifnomangiz buferga nusxalanadi.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {searchedUsers.map((u) => {
                        const isInvited = invitedUserIds.includes(u.id);
                        return (
                          <div
                            key={u.id}
                            className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200/60 flex items-center justify-between gap-3 transition"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <img
                                src={u.avatar}
                                alt={u.name}
                                className="w-8 h-8 rounded-full bg-slate-200 shrink-0 object-cover"
                              />
                              <div className="min-w-0">
                                <div className="font-bold text-xs text-slate-800 truncate">{u.name}</div>
                                <div className="text-[10px] text-slate-400 truncate">{u.email}</div>
                              </div>
                            </div>

                            <button
                              type="button"
                              disabled={isInvited || inviteCooldown > 0}
                              onClick={() => handleSendInvite(u)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 shrink-0 transition ${
                                isInvited
                                  ? 'bg-emerald-100 text-emerald-700 opacity-80 cursor-default'
                                  : inviteCooldown > 0
                                  ? 'bg-slate-200 text-slate-500 cursor-not-allowed opacity-80'
                                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                              }`}
                            >
                              {isInvited ? (
                                <>
                                  <UserCheck className="w-3.5 h-3.5" />
                                  <span>Taklif qilindi</span>
                                </>
                              ) : inviteCooldown > 0 ? (
                                <>
                                  <UserPlus className="w-3.5 h-3.5" />
                                  <span>{inviteCooldown}s kuting</span>
                                </>
                              ) : (
                                <>
                                  <UserPlus className="w-3.5 h-3.5" />
                                  <span>Taklif yuborish</span>
                                </>
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowInviteModal(false);
                  setInviteInput('');
                  setInvitedStatus(null);
                }}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-extrabold text-xs transition"
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Alias (Qalamcha - Rename) Modal */}
      {aliasModalData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999]">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-100 flex flex-col gap-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-2.5 text-[#3390EC]">
              <div className="p-2 bg-sky-50 rounded-xl">
                <Pencil className="w-5 h-5 text-[#3390EC]" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-800">Nomni o'zgartirish</h3>
                <p className="text-xs text-slate-500">Ushbu nom faqat sizga ko'rinadi</p>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-600">Suhbatdosh uchun yangi nom:</label>
              <input
                type="text"
                value={aliasInputValue}
                onChange={(e) => setAliasInputValue(e.target.value)}
                placeholder="Yangi nom kiriting..."
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveAlias();
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#3390EC] focus:ring-2 focus:ring-[#3390EC]/20 text-sm font-medium text-slate-800"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              {customAliases[aliasModalData.channelId] && (
                <button
                  type="button"
                  onClick={handleResetAlias}
                  className="mr-auto px-3 py-2 rounded-xl text-xs font-bold text-amber-600 hover:bg-amber-50 transition"
                >
                  Asliga qaytarish
                </button>
              )}
              <button
                type="button"
                onClick={() => setAliasModalData(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                onClick={handleSaveAlias}
                className="px-4 py-2 rounded-xl text-xs font-extrabold text-white bg-[#3390EC] hover:bg-blue-600 transition shadow-xs"
              >
                Saqlash
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Direct Chat (Axlat chelagi) Modal */}
      {deleteModalData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999]">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-100 flex flex-col gap-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-2.5 bg-red-50 rounded-2xl shrink-0">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-800">Shaxsiy chatni o'chirish</h3>
                <p className="text-xs text-red-600 font-medium">Bu amalni ortga qaytarib bo'lmaydi!</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              <strong className="text-slate-800">"{deleteModalData.name}"</strong> bilan bo'lgan ushbu shaxsiy chat va uning barcha xabarlari butunlay o'chiriladi.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isDeletingChat}
                onClick={() => setDeleteModalData(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                disabled={isDeletingChat}
                onClick={handleConfirmDeleteChat}
                className="px-4 py-2 rounded-xl text-xs font-extrabold text-white bg-red-600 hover:bg-red-700 transition shadow-xs flex items-center gap-1.5"
              >
                {isDeletingChat ? (
                  <span>O'chirilmoqda...</span>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Butunlay o'chirish</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
