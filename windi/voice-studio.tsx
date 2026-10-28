"use client";

import { VoiceAdminPanel } from './voice-admin-panel';
import { VoiceId } from './voice-id';
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AudioLines,
  ArrowDownToLine,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleDot,
  Clock3,
  Copy,
  FileAudio,
  Headphones,
  LoaderCircle,
  Mars,
  Megaphone,
  MessageCircleMore,
  Mic2,
  Music2,
  PartyPopper,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Upload,
  Venus,
  Wallet,
  X,
} from "lucide-react";
import { useAuth } from "./auth-context";
import {
  countCredits,
  formatNumber,
  isComparisonVoice,
  isHeyGenLibraryVoice,
  CURATED_PUBLIC_VOICES,
  DEFAULT_STUDIO_VOICE,
  VOICE_LANGUAGES,
  VOICE_CLONE_CLIP_LIMITS,
  VOICE_CLONE_DEMO_SAMPLES,
  type VoiceClone,
  type VoiceCloneSample,
  VOICE_LIBRARY_LANGUAGES,
  VOICE_PLANS,
  VOICE_API_ENABLED,
  MAX_WEB_GENERATION_CHARACTERS,
  type StudioVoice,
  type VoiceAccent,
  type VoiceAccount,
  type VoiceOrder,
} from "@/lib/voice/shared";
import { VoiceApiTokens } from "./voice-api-tokens";
import { FeedbackToast } from "./feedback-toast";

type Tab = "create" | "voices" | "clone" | "history" | "plans";
const tabs = [
  { id: "clone", label: "Tạo giọng của tôi", icon: Mic2 },
  { id: "create", label: "Tạo âm thanh", icon: AudioLines },
  { id: "voices", label: "Thư viện giọng", icon: Headphones },
  { id: "history", label: "Lịch sử", icon: Clock3 },
  { id: "plans", label: "Gói dịch vụ", icon: Wallet },
] as const;
const samples = [
  {
    label: "Kể chuyện",
    text: "Có những ngày, chúng ta chỉ cần chậm lại một chút. Pha một tách trà, mở cửa sổ, và lắng nghe thành phố đang thức giấc. Câu chuyện hôm nay bắt đầu từ một khoảnh khắc rất đỗi bình thường như thế.",
  },
  {
    label: "Video ngắn",
    text: "Bạn có biết vì sao giọng nói của mình trong bản ghi âm lại khác với những gì bạn thường nghe? Câu trả lời nằm ở cách âm thanh truyền đến tai. Cùng khám phá nhé!",
  },
  {
    label: "Giới thiệu",
    text: "Chào mừng bạn đến với Windi Studio. Nơi ý tưởng của bạn tìm thấy tiếng nói riêng. Chọn một giọng đọc, viết câu chuyện, và bắt đầu sáng tạo.",
  },
];
const statusName = (s: string) =>
  ({
    ready: "Hoàn tất",
    failed: "Đã hoàn credit",
    unknown: "Đang đối soát",
    pending: "Đang xử lý / đối soát",
    reserved: "Đã tiếp nhận",
    paid: "Đã thanh toán",
    expired: "Hết hạn",
    review: "Cần đối soát",
  })[s] || s;
const MAX_CLONE_CLIP_SECONDS = VOICE_CLONE_CLIP_LIMITS.maxDurationMs / 1000;

function formatClipDuration(seconds: number) {
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(seconds);
}

function readClipDuration(file: File) {
  return new Promise<number>((resolve, reject) => {
    const audio = document.createElement("audio");
    const url = URL.createObjectURL(file);
    const cleanup = () => {
      audio.onloadedmetadata = null;
      audio.onerror = null;
      audio.removeAttribute("src");
      audio.load();
      URL.revokeObjectURL(url);
    };
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      const duration = audio.duration;
      cleanup();
      if (!Number.isFinite(duration) || duration <= 0) {
        reject(new Error("Không đọc được thời lượng file. Hãy chọn file âm thanh hợp lệ."));
        return;
      }
      resolve(duration);
    };
    audio.onerror = () => {
      cleanup();
      reject(new Error("Không đọc được thời lượng file. Hãy chọn MP3, WAV, FLAC, OGG hoặc WebM hợp lệ."));
    };
    audio.src = url;
  });
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/voice/${path}`, {
    ...init,
    cache: "no-store",
  });
  const body = await response.json();
  if (!response.ok)
    throw new Error(body.error || "Chưa thể kết nối. Vui lòng thử lại.");
  return body;
}
const jsonPost = (body: unknown) => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});
const date = (v: string) => new Date(v).toLocaleDateString("vi-VN");
function VoiceMetadata({ voice }: { voice: StudioVoice }) {
  return (
    <div className="voice-metadata" aria-label="Thông tin giọng">
      {voice.gender === "masculine" && (
        <span
          className="voice-metadata-gender"
          title="Giọng nam"
          aria-label="Giọng nam"
        >
          <Mars size={15} />
        </span>
      )}
      {voice.gender === "feminine" && (
        <span
          className="voice-metadata-gender"
          title="Giọng nữ"
          aria-label="Giọng nữ"
        >
          <Venus size={15} />
        </span>
      )}
      {voice.gender === "gender_neutral" && (
        <span
          className="voice-metadata-gender"
          title="Giọng trung tính"
          aria-label="Giọng trung tính"
        >
          <CircleDot size={15} />
        </span>
      )}
      {voice.useCases?.includes("advertising") && (
        <span
          className="voice-metadata-advertising"
          title="Windi Clone Pro 3.0 ghi chú: quảng cáo"
          aria-label="Windi Clone Pro 3.0 ghi chú: quảng cáo"
        >
          <Megaphone size={15} />
        </span>
      )}
      {voice.useCases?.includes("conversation") && (
        <span
          className="voice-metadata-conversation"
          title="Windi Clone Pro 3.0 ghi chú: hội thoại"
          aria-label="Windi Clone Pro 3.0 ghi chú: hội thoại"
        >
          <MessageCircleMore size={15} />
        </span>
      )}
      {voice.useCases?.includes("entertainment") && (
        <span
          className="voice-metadata-entertainment"
          title="Windi Clone Pro 3.0 ghi chú: giải trí"
          aria-label="Windi Clone Pro 3.0 ghi chú: giải trí"
        >
          <PartyPopper size={15} />
        </span>
      )}
    </div>
  );
}

const voiceComparisons = [
  {
    id: "healing",
    title: "Voice Podcast Chữa Lành",
    voiceId: "6aee11c6-bef9-4fd0-9f45-1a1c25dcdcde",
    voiceName: "Chữa Lành",
    style: "Ấm áp · chậm rãi · giàu khoảng lặng",
    other: "/voice-comparisons/other/chua%20lanh.MP3",
    pro: "/voice-comparisons/clone-pro/chua%20lanh.wav",
    gender: "feminine",
    sampleText:
      "Có những ngày, chúng ta chỉ cần chậm lại một chút. Pha một tách trà, mở cửa sổ, và lắng nghe thành phố đang thức giấc. Câu chuyện hôm nay bắt đầu từ một khoảnh khắc rất đỗi bình thường như thế.",
  },
  {
    id: "male-vlog",
    title: "Giọng Nam Vlog (Khoa)",
    voiceId: "f2a05c6a-fc36-4d1a-b5c4-dd2e5af15af7",
    voiceName: "Khoa",
    style: "Tự nhiên · gần gũi · giàu năng lượng",
    other: "/voice-comparisons/other/nam%20vlog.MP3",
    pro: "/voice-comparisons/clone-pro/nam%20vlog.MP3",
    gender: "masculine",
    sampleText:
      "Bạn có biết vì sao giọng nói của mình trong bản ghi âm lại khác với những gì bạn thường nghe? Câu trả lời nằm ở cách âm thanh truyền đến tai. Cùng khám phá nhé!",
  },
  {
    id: "female-podcast",
    title: "Nữ Podcast (T.Min)",
    voiceId: "c61ed9bd-944a-40db-b302-410985821200",
    voiceName: "T Min",
    style: "Chín chắn · rõ ý · đúng nhịp trò chuyện",
    other: "/voice-comparisons/other/nu%20podcast.MP3",
    pro: "/voice-comparisons/clone-pro/nu%20podcast.wav",
    gender: "feminine",
    sampleText:
      "Chào mừng bạn đến với số podcast hôm nay. Hôm nay chúng ta sẽ cùng ngồi lại, chia sẻ những suy nghĩ chân thật nhất về hành trình học cách yêu thương bản thân.",
  },
  {
    id: "female-vlog",
    title: "Nữ Vlog (T.Nhi)",
    voiceId: "b30f58c7-3a20-4144-a8b2-ee64cf5ae28e",
    voiceName: "T Nhi",
    style: "Tươi sáng · linh hoạt · bắt nhịp nhanh",
    other: "/voice-comparisons/other/nu%20vlog.MP3",
    pro: "/voice-comparisons/clone-pro/nu%20vlog.wav",
    gender: "feminine",
    sampleText:
      "Hello mọi người! Hôm nay theo chân mình khám phá một góc nhỏ cực kỳ thú vị giữa lòng thành phố nha, bảo đảm xem xong là muốn xách balo đi liền!",
  },
  {
    id: "horror",
    title: "Truyện Ma (Loc Thanh)",
    voiceId: "293e81de-ef7a-40ec-bdbc-3e641e76256c",
    voiceName: "Truyện Ma",
    style: "Kịch tính · kéo nhịp · tạo không khí",
    other: "/voice-comparisons/other/truyen%20ma.MP3",
    pro: "/voice-comparisons/clone-pro/truyen%20ma.wav",
    gender: "masculine",
    sampleText:
      "Đêm đã về khuya, xung quanh bốn bề im phăng phắc. Cánh cửa gỗ cọt kẹt tự hé mở, và từ góc cầu thang tối tăm... một bóng đen từ từ bước xuống.",
  },
] as const;

const comparisonWave = [
  9, 17, 12, 25, 31, 18, 36, 23, 15, 29, 20, 12, 26, 18, 8,
];

function VoiceComparisonShowcase({
  onClone,
}: {
  onClone: () => void;
}) {
  const [playing, setPlaying] = useState("");
  const [activeSampleIndex, setActiveSampleIndex] = useState(0);
  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({});
  function toggle(key: string) {
    const current = audioRefs.current[key];
    if (!current) return;
    Object.entries(audioRefs.current).forEach(([id, audio]) => {
      if (id !== key && !audio?.paused) audio?.pause();
    });
    if (current.paused) void current.play();
    else current.pause();
  }
  return (
    <section
      className="voice-compare"
      id="voice-comparison"
      aria-labelledby="voice-compare-title"
    >
      <div className="voice-compare-intro">
        <div>
          <span className="voice-compare-kicker">
            <Sparkles size={14} /> 5 BÀI NGHE THỰC TẾ
          </span>
          <h2 id="voice-compare-title">
            Giọng giống thôi chưa đủ.
            <br />
            <span>Người nghe cần cảm thấy nó.</span>
          </h2>
          <p>
            Windi Clone Pro 3.0 kết hợp chất giọng riêng với khả năng đọc ngữ cảnh để
            lời thoại tự tìm nhịp điệu, ngữ điệu và sắc thái phù hợp.
          </p>
        </div>
        <div className="voice-compare-proof">
          <strong>01 → 05</strong>
          <span>
            Nghe A/B.
            <br />
            Tự cảm nhận khác biệt.
          </span>
        </div>
      </div>
      <div className="voice-compare-points" aria-label="Điểm nổi bật">
        <span>
          <Check size={14} /> Bắt sắc thái từ lời thoại
        </span>
        <span>
          <Check size={14} /> Giữ nhận diện chất giọng
        </span>
        <span>
          <Check size={14} /> Sẵn sàng cho nhiều format
        </span>
      </div>
      <section className="voice-usage-note" aria-labelledby="voice-sample-rights-title">
        <h3 id="voice-sample-rights-title">Lưu ý về 5 giọng mẫu</h3>
        <p>
          Windi không sở hữu bản quyền đối với 5 giọng mẫu này. Các mẫu chỉ được
          cung cấp để nghe và tham khảo chất lượng dịch vụ, không hỗ trợ tạo
          nội dung mới bằng các giọng này và không cấp quyền sử dụng chúng cho
          nội dung cá nhân hoặc thương mại. Vui lòng clone giọng nói của chính bạn để
          sử dụng cho nội dung của mình.
        </p>
      </section>
      <div className="voice-compare-mobile-pills" role="tablist" aria-label="Chọn bài nghe thực tế">
        {voiceComparisons.map((sample, idx) => (
          <button
            key={sample.id}
            type="button"
            role="tab"
            aria-selected={activeSampleIndex === idx}
            className={`voice-compare-pill ${activeSampleIndex === idx ? "is-active" : ""}`}
            onClick={() => setActiveSampleIndex(idx)}
          >
            <span>0{idx + 1}</span> {sample.title}
          </button>
        ))}
      </div>
      <div className="voice-compare-list">
        {voiceComparisons.map((sample, index) => {
          return (
            <article className={`voice-compare-row ${activeSampleIndex === index ? "is-mobile-active" : ""}`} key={sample.id}>
              <div className="voice-compare-name">
                <span>0{index + 1}</span>
                <div>
                  <h3>{sample.title}</h3>
                  <p>Tiêu chí nghe: {sample.style}</p>
                </div>
              </div>
              {(
                [
                  {
                    kind: "other",
                    label: "Dịch vụ clone khác",
                    src: sample.other,
                  },
                  { kind: "pro", label: "Windi Clone Pro 3.0", src: sample.pro },
                ] as const
              ).map((side) => {
                const key = `${sample.id}-${side.kind}`;
                const active = playing === key;
                return (
                  <div
                    className={`voice-compare-side voice-compare-${side.kind}`}
                    key={side.kind}
                  >
                    <div>
                      <span>{side.label}</span>
                      {side.kind === "pro" && <small>CONTEXT-AWARE</small>}
                    </div>
                    <audio
                      ref={(node) => {
                        audioRefs.current[key] = node;
                      }}
                      src={side.src}
                      preload="none"
                      onPlay={() => setPlaying(key)}
                      onPause={() =>
                        setPlaying((current) => (current === key ? "" : current))
                      }
                      onEnded={() =>
                        setPlaying((current) => (current === key ? "" : current))
                      }
                    />
                    <button
                      type="button"
                      className="voice-compare-play-btn"
                      onClick={() => toggle(key)}
                      aria-label={`${active ? "Dừng" : "Nghe"} ${side.label}: ${sample.title}`}
                      aria-pressed={active}
                    >
                      <i>{active ? <Pause size={16} /> : <Play size={16} />}</i>
                      <span className="voice-compare-wave" aria-hidden="true">
                        {comparisonWave.map((height, i) => (
                          <b key={i} style={{ height: `${height}px` }} />
                        ))}
                      </span>
                      <strong>{active ? "Đang phát" : "Nghe thử"}</strong>
                    </button>

                  </div>
                );
              })}
            </article>
          );
        })}
      </div>
      <div className="voice-compare-cta">
        <div>
          <strong>Đừng để một kịch bản hay bị giọng đọc phẳng kéo tụt.</strong>
          <span>
            Clone một lần. Dùng chất giọng của bạn cho những câu chuyện tiếp
            theo.
          </span>
        </div>
        <button
          className="voice-btn voice-primary"
          type="button"
          onClick={onClone}
        >
          Tạo giọng Windi Clone Pro 3.0 <ArrowRight size={16} />
        </button>
      </div>
      <p className="voice-compare-note">
        Các bản demo được phát trực tiếp để bạn tự đánh giá. Kết quả thực tế phụ
        thuộc chất lượng mẫu thu, giọng nguồn và nội dung lời thoại.
      </p>
    </section>
  );
}

export function VoiceStudio() {
  const { user, isLoading } = useAuth();
  const [tab, setTab] = useState<Tab>("create");
  const [verticalNavigation, setVerticalNavigation] = useState(false);
  const [voices, setVoices] = useState<StudioVoice[]>([...CURATED_PUBLIC_VOICES]);
  const [selected, setSelected] = useState<StudioVoice>(
    DEFAULT_STUDIO_VOICE,
  );
  const [available, setAvailable] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [payments, setPayments] = useState(false);
  const [account, setAccount] = useState<VoiceAccount | null>(null);
  const [accountError, setAccountError] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [text, setText] = useState("");
  const [language, setLanguage] = useState("vi");
  const [speed, setSpeed] = useState(1);
  const [activePlanId, setActivePlanId] = useState<string>(
    VOICE_PLANS.find((p) => p.id === "credit_100k")?.id || "credit_100k",
  );
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [gender, setGender] = useState("all");
  const [voicePickerOpen, setVoicePickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerLanguage, setPickerLanguage] = useState("all");
  const [pickerGender, setPickerGender] = useState("all");
  const [pickerMine, setPickerMine] = useState(false);
  const voicePickerRef = useRef<HTMLDialogElement>(null);
  const previewRequest = useRef(0);
  const [audio, setAudio] = useState<{ url: string; id: string } | null>(null);
  const [playingJobId, setPlayingJobId] = useState<string | null>(null);
  const jobAudioRef = useRef<HTMLAudioElement>(null);
  const jobUrls = useRef(new Map<string, string>());
  const [previewingId, setPreviewingId] = useState("");
  const [previewLoadingId, setPreviewLoadingId] = useState("");
  const [cloneName, setCloneName] = useState("");
  const [cloneLanguage, setCloneLanguage] = useState("vi");
  const [cloneAccent, setCloneAccent] = useState("");
  const [cloneAccents, setCloneAccents] = useState<VoiceAccent[]>([]);
  const [accentLoading, setAccentLoading] = useState(false);
  const [clip, setClip] = useState<File | null>(null);
  const [clipUrl, setClipUrl] = useState("");
  const [clipDuration, setClipDuration] = useState<number | null>(null);
  const [clipChecking, setClipChecking] = useState(false);
  const [consent, setConsent] = useState(false);
  const [checkout, setCheckout] = useState<{
    order: VoiceOrder;
    bank: { bank: string; account: string; name: string } | null;
    cloneRetained?: boolean;
  } | null>(null);
  const [demoNow, setDemoNow] = useState(() => Date.now());
  const demoPreviewUrl = useRef<string | null>(null);
  const demoPreviewRequest = useRef(0);
  const demoAudioRef = useRef<HTMLAudioElement>(null);
  const demoAuditionCloneId = useRef<string | null>(null);
  const [heardDemoIds, setHeardDemoIds] = useState<string[]>([]);
  const [demoPlaying, setDemoPlaying] = useState("");
  const [demoLoading, setDemoLoading] = useState("");
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const previewAudioRef = useRef<HTMLAudioElement>(null);
  const previewUrls = useRef(new Map<string, string>());
  const previewPreloads = useRef(new Map<string, Promise<string | undefined>>());
  const activeUser = useRef(user?.id);
  activeUser.current = user?.id;
  const requestKey = useRef<{ payload: string; key: string } | null>(null);
  const cloneKey = useRef<string | null>(null);
  const clipValidation = useRef(0);
  const clipInputRef = useRef<HTMLInputElement>(null);
  const cloneResultsRef = useRef<HTMLHeadingElement>(null);
  const isAdmin = account?.isAdmin === true;
  const period = account?.period;
  const workflowBonusRemaining = account?.bonus
    ? account.bonus.voice_credits - account.bonus.voice_credits_used
    : 0;
  const planRemaining = period ? period.credits - period.used_credits : 0;
  const remaining = planRemaining + workflowBonusRemaining;
  const largestBalance = Math.max(planRemaining, workflowBonusRemaining);
  const credits = countCredits(text);
  const cloneVoices: StudioVoice[] = (account?.clones || [])
    .filter((c) => c.status === "ready" && c.provider_id && !c.is_demo)
    .map((c) => ({
      id: c.provider_id!,
      name: c.name,
      language: c.language,
      description: c.accent
        ? `Giọng riêng của bạn · ${c.accent}`
        : "Giọng riêng của bạn",
      kind: "clone",
    }));
  const activeCloneCount = (account?.clones || []).filter((c) =>
    !c.is_demo && ["ready", "reserved", "pending"].includes(c.status),
  ).length;
  const allVoices = [...cloneVoices, ...voices].filter(voice => isHeyGenLibraryVoice(voice) && !isComparisonVoice(voice.id));
  const currentPlan = VOICE_PLANS.find((p) => p.id === period?.plan_id);
  const canClone = isAdmin || (!!period?.clone_limit && activeCloneCount < period.clone_limit);
  const visibleClones = (account?.clones ?? []).filter(c => !c.is_demo || Date.parse(c.demo_expires_at!) > demoNow);
  const canGenerate =
    !!user &&
    available &&
    (isAdmin || !!period || workflowBonusRemaining > 0) &&
    credits > 0 &&
    credits <= MAX_WEB_GENERATION_CHARACTERS &&
    (isAdmin || credits <= largestBalance) &&
    !busy;

  const refresh = useCallback(async () => {
    const uid = user?.id;
    if (!uid) {
      setAccount(null);
      setAccountError("");
      return;
    }
    try {
      const data = await api<
        VoiceAccount & { available: boolean; paymentsAvailable: boolean }
      >("account");
      if (activeUser.current !== uid) return;
      setAccount(data);
      setAvailable(data.available);
      setPayments(data.paymentsAvailable);
      setAccountError("");
    } catch (e) {
      if (activeUser.current === uid) setAccountError((e as Error).message);
    }
  }, [user?.id]);
  const loadVoices = useCallback(async () => {
    setCatalogLoading(true);
    try {
      const data = await api<{ voices: StudioVoice[]; available: boolean }>(
        "voices",
      );
      setVoices(data.voices);
      setAvailable(data.available);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCatalogLoading(false);
    }
  }, []);
  useEffect(() => {
    void loadVoices();
  }, [loadVoices]);
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 901px)");
    const update = () => setVerticalNavigation(desktop.matches);
    update();
    desktop.addEventListener("change", update);
    return () => desktop.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    setAudio(null);
    setAccount(null);
    setCheckout(null);
    setSelected(DEFAULT_STUDIO_VOICE);
    setHeardDemoIds([]);
    void refresh();
  }, [refresh]);
  useEffect(() => {
    if (clip) {
      const url = URL.createObjectURL(clip);
      setClipUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setClipUrl("");
  }, [clip]);
  useEffect(() => {
    if (tab !== "clone" || !user || !available) return;
    let current = true;
    setAccentLoading(true);
    setCloneAccent("");
    void api<{ accents: VoiceAccent[] }>(
      `accents?language=${encodeURIComponent(cloneLanguage)}`,
    )
      .then((data) => {
        if (current) setCloneAccents(data.accents);
      })
      .catch(() => {
        if (current) setCloneAccents([]);
      })
      .finally(() => {
        if (current) setAccentLoading(false);
      });
    return () => {
      current = false;
    };
  }, [available, cloneLanguage, tab, user]);
  useEffect(() => {
    if (checkout && !dialogRef.current?.open) dialogRef.current?.showModal();
    if (!checkout && dialogRef.current?.open) dialogRef.current.close();
  }, [checkout]);
  useEffect(() => {
    if (!checkout || checkout.order.status !== "pending") return;
    const poll = async () => {
      try {
        const data = await api<typeof checkout>(
          `orders?id=${checkout.order.id}`,
        );
        setCheckout(data);
        if (data?.order.status === "paid") {
          setNotice(data.order.demo_clone_id
            ? data.cloneRetained
              ? "Thanh toán thành công. Giọng vừa clone đã được giữ lại và sẵn sàng sử dụng."
              : "Thanh toán thành công. Giọng nghe thử đã hết hạn hoặc bị thay thế; bạn có thể tạo giọng mới bằng gói vừa mua."
            : "Thanh toán thành công. Gói của bạn đã sẵn sàng!");
          void refresh();
        }
      } catch {
        /* Keep the order visible; manual refresh is available. */
      }
    };
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void poll();
    }, 5000);
    return () => clearInterval(timer);
  }, [checkout?.order.id, checkout?.order.status, refresh]);
  useEffect(() => {
    if (!checkout || checkout.order.status !== "pending") return;
    const update = () => {
      const expiresMs = Date.parse(checkout.order.expires_at);
      const left = Math.max(0, Math.floor((expiresMs - Date.now()) / 1000));
      setSecondsRemaining(left);
      if (left <= 0) {
        setCheckout((prev) =>
          prev
            ? { ...prev, order: { ...prev.order, status: "expired" } }
            : null,
        );
      }
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [checkout?.order.id, checkout?.order.expires_at, checkout?.order.status]);
  useEffect(() => {
    if (
      !account?.jobs.some((j) => ["pending", "reserved"].includes(j.status)) &&
      !account?.clones.some((c) => ["pending", "reserved"].includes(c.status))
    )
      return;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 15000);
    return () => clearInterval(timer);
  }, [account, refresh]);
  useEffect(
    () => () => {
      previewAudioRef.current?.pause();
      previewUrls.current.forEach((url) => URL.revokeObjectURL(url));
    },
    [],
  );
  useEffect(() => {
    if (catalogLoading) return;
    const controller = new AbortController();
    const owned = new Map<string, Promise<string | undefined>>();
    const vietnamese = voices.filter(voice => voice.language === "vi" && voice.kind === "public" && !isComparisonVoice(voice.id));
    // Warm only saved samples: entering the page must never generate paid audio.
    for (const voice of vietnamese) {
      if (previewUrls.current.has(voice.id) || previewPreloads.current.has(voice.id)) continue;
      const pending = fetch(`/api/voice/preview?id=${encodeURIComponent(voice.id)}&storedOnly=1`, { cache: "force-cache", signal: controller.signal })
        .then(async response => {
          if (!response.ok) return undefined;
          const blob = await response.blob();
          if (controller.signal.aborted || !blob.size) return undefined;
          const url = URL.createObjectURL(blob);
          previewUrls.current.set(voice.id, url);
          return url;
        })
        .catch(() => undefined);
      previewPreloads.current.set(voice.id, pending);
      owned.set(voice.id, pending);
      void pending.finally(() => {
        if (previewPreloads.current.get(voice.id) === pending) previewPreloads.current.delete(voice.id);
      });
    }
    return () => {
      controller.abort();
      owned.forEach((pending, id) => {
        if (previewPreloads.current.get(id) === pending) previewPreloads.current.delete(id);
      });
    };
  }, [catalogLoading, voices]);
  function stopJobAudio() {
    jobAudioRef.current?.pause();
    setPlayingJobId(null);
  }
  function stopPreview() {
    previewRequest.current += 1;
    previewAudioRef.current?.pause();
    setPreviewingId("");
    setPreviewLoadingId("");
  }
  function choose(v: StudioVoice) {
    stopPreview();
    stopJobAudio();
    setSelected(v);
    setTab("create");
    setNotice(`Đã chọn giọng ${v.name}.`);
  }
  async function previewVoice(voice: StudioVoice) {
    if (voice.kind !== "public" || previewLoadingId) return;
    if (previewingId === voice.id) {
      stopPreview();
      return;
    }
    stopPreview();
    stopJobAudio();
    const requestId = previewRequest.current;
    setPreviewLoadingId(voice.id);
    setError("");
    try {
      let url = previewUrls.current.get(voice.id);
      if (!url) url = await previewPreloads.current.get(voice.id);
      if (!url) {
        const comparisonMatch = voiceComparisons.find(
          (c) => c.voiceId === voice.id,
        );
        if (comparisonMatch) {
          url = comparisonMatch.pro;
        } else {
          const response = await fetch(
            `/api/voice/preview?id=${encodeURIComponent(voice.id)}`,
            { cache: "force-cache" },
          );
          if (!response.ok) {
            const body = await response.json().catch(() => ({}));
            throw new Error(body.error || "Chưa tạo được bản nghe thử.");
          }
          url = URL.createObjectURL(await response.blob());
          previewUrls.current.set(voice.id, url);
        }
      }
      if (requestId !== previewRequest.current) return;
      const player = previewAudioRef.current;
      if (!player) throw new Error("Trình phát đang chưa sẵn sàng.");
      player.src = url;
      await player.play();
      if (requestId !== previewRequest.current) return;
      setPreviewingId(voice.id);
    } catch (error) {
      if (requestId !== previewRequest.current) return;
      setError(
        error instanceof Error ? error.message : "Chưa tạo được bản nghe thử.",
      );
    } finally {
      if (requestId === previewRequest.current) setPreviewLoadingId("");
    }
  }
  function stopDemoPreview() {
    demoPreviewRequest.current++;
    demoAuditionCloneId.current = null;
    demoAudioRef.current?.pause();
    demoAudioRef.current?.removeAttribute("src");
    if (demoPreviewUrl.current) URL.revokeObjectURL(demoPreviewUrl.current);
    demoPreviewUrl.current = null;
    setDemoPlaying("");
    setDemoLoading("");
  }
  useEffect(() => {
    if (!account?.clones.some(c => c.is_demo)) return;
    setDemoNow(Date.now());
    const timer = window.setInterval(() => setDemoNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [account]);
  useEffect(() => {
    const [cloneId] = (demoPlaying || demoLoading).split(":");
    const clone = account?.clones.find(c => c.id === cloneId);
    if (cloneId && (!clone || (clone.is_demo && Date.parse(clone.demo_expires_at!) <= demoNow))) stopDemoPreview();
  }, [account, demoNow, demoPlaying, demoLoading]);
  useEffect(() => {
    stopDemoPreview();
    return () => {
      demoPreviewRequest.current++;
      demoAudioRef.current?.pause();
      if (demoPreviewUrl.current) URL.revokeObjectURL(demoPreviewUrl.current);
    };
  }, [user?.id, tab]);
  async function previewClone(clone: VoiceClone, preset: VoiceCloneSample) {
    const key = `${clone.id}:${preset}`;
    const wasPlaying = demoPlaying === key;
    stopPreview();
    stopDemoPreview();
    stopJobAudio();
    if (wasPlaying) return;
    const requestId = demoPreviewRequest.current;
    setDemoLoading(key);
    setError("");
    try {
      const response = await fetch("/api/voice/clone-preview", jsonPost({cloneId:clone.id, preset}));
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Chưa tải được mẫu nghe thử.");
      }
      const blob = await response.blob();
      if (requestId !== demoPreviewRequest.current || (clone.is_demo && Date.parse(clone.demo_expires_at!) <= Date.now())) return;
      const url = URL.createObjectURL(blob);
      demoPreviewUrl.current = url;
      const player = demoAudioRef.current;
      if (!player) return;
      player.src = url;
      demoAuditionCloneId.current = clone.id;
      await player.play();
      if (requestId === demoPreviewRequest.current) setDemoPlaying(key);
    } catch (error) {
      if (requestId === demoPreviewRequest.current) {
        demoAuditionCloneId.current = null;
        setError((error as Error).message);
      }
    } finally {
      if (requestId === demoPreviewRequest.current) setDemoLoading("");
    }
  }
  async function generate() {
    if (!canGenerate) return;
    setBusy("generate");
    setError("");
    setNotice("");
    const payload = JSON.stringify({
      text: text.normalize("NFC").trim(),
      voiceId: selected.id,
      language,
      speed,
    });
    if (requestKey.current?.payload !== payload)
      requestKey.current = { payload, key: crypto.randomUUID() };
    try {
      const result = await api<{ id: string; url: string }>(
        "generate",
        jsonPost({
          ...JSON.parse(payload),
          requestKey: requestKey.current.key,
        }),
      );
      stopPreview();
      stopDemoPreview();
      jobUrls.current.set(result.id, result.url);
      setAudio(result);
      setPlayingJobId(result.id);
      requestKey.current = null;
      setNotice("Âm thanh đã sẵn sàng và đang tự động phát.");
      const player = jobAudioRef.current;
      if (player) {
        player.src = result.url;
        player.currentTime = 0;
        void player.play().catch(() => {});
      }
    } catch (e) {
      setError((e as Error).message);
      if ((e as Error).message.includes("hoàn lại")) requestKey.current = null;
    } finally {
      setBusy("");
      void refresh();
    }
  }
  async function listen(id: string) {
    stopPreview();
    stopDemoPreview();
    const player = jobAudioRef.current;

    // Toggle pause if clicking on the one currently playing
    if (playingJobId === id && player) {
      player.pause();
      setPlayingJobId(null);
      return;
    }

    // If audio is already loaded and paused: play directly without refetching
    if (audio?.id === id && player) {
      player.currentTime = 0;
      setPlayingJobId(id);
      void player.play().catch(() => {});
      return;
    }

    setBusy(id);
    setError("");
    try {
      let url = jobUrls.current.get(id);
      if (!url) {
        const result = await api<{ url: string }>(`audio?id=${id}`);
        url = result.url;
        jobUrls.current.set(id, url);
      }
      setAudio({ id, url });
      setPlayingJobId(id);
      if (player) {
        player.src = url;
        player.currentTime = 0;
        void player.play().catch(() => {});
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  useEffect(() => {
    if (audio?.url && jobAudioRef.current && playingJobId === audio.id) {
      const player = jobAudioRef.current;
      if (player.src !== audio.url) {
        player.src = audio.url;
      }
      void player.play().catch(() => {});
    }
  }, [audio, playingJobId]);
  async function cloneVoice(event: React.FormEvent) {
    event.preventDefault();
    if (!clip || !consent || busy || clipChecking || clipDuration === null) return;
    if (clipDuration > MAX_CLONE_CLIP_SECONDS) {
      setError("Mẫu ghi âm tối đa 60 giây. Hãy cắt ngắn file rồi tải lại.");
      return;
    }
    setBusy("clone");
    setError("");
    cloneKey.current ||= crypto.randomUUID();
    let created = false;
    const form = new FormData();
    form.set("clip", clip);
    form.set("durationMs", String(Math.round(clipDuration * 1000)));
    form.set("name", cloneName);
    form.set("language", cloneLanguage);
    if (cloneAccent) form.set("accent", cloneAccent);
    form.set("consent", "true");
    form.set("requestKey", cloneKey.current);
    try {
      stopDemoPreview();
      const result = await api<{voice_id?:string;is_demo?:boolean}>("clone", { method: "POST", body: form });
      setNotice(result.is_demo
        ? "Giọng nghe thử đã sẵn sàng. Hãy nghe một trong hai đoạn mẫu bên dưới để cảm nhận giọng của bạn."
        : "Giọng riêng đã được tạo thành công. Bạn có thể dùng ngay trong Voice Studio hoặc mở mục Giọng của tôi để sao chép Voice ID.");
      setClip(null);
      setClipDuration(null);
      if (clipInputRef.current) clipInputRef.current.value = "";
      setCloneName("");
      setCloneAccent("");
      setConsent(false);
      cloneKey.current = null;
      created = true;
    } catch (e) {
      setError((e as Error).message);
      if ((e as Error).message.includes("hoàn lại")) cloneKey.current = null;
    } finally {
      setBusy("");
      await refresh();
      if (created) requestAnimationFrame(() => {
        cloneResultsRef.current?.focus({ preventScroll: true });
        cloneResultsRef.current?.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
          block: "start",
        });
      });
    }
  }
  async function removeClone(id: string) {
    if (
      !window.confirm(
        "Xóa giọng này khỏi thư viện Windi Clone Pro 3.0? Slot clone sẽ được giải phóng, nhưng credit đã dùng không được hoàn lại.",
      )
    )
      return;
    setBusy(id);
    setError("");
    try {
      await api(`clone?id=${id}`, { method: "DELETE" });
      setNotice("Đã xóa giọng và giải phóng slot clone.");
      if (account?.clones.find((c) => c.id === id)?.provider_id === selected.id)
        setSelected(DEFAULT_STUDIO_VOICE);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
      await refresh();
    }
  }
  async function purchase(planId: string, demoCloneId?: string) {
    if (planId === "credit_10k" && !demoCloneId) {
      demoCloneId = visibleClones.find(c => c.is_demo && c.status === "ready")?.id;
    }
    setBusy(planId);
    setError("");
    try {
      const data = await api<NonNullable<typeof checkout>>(
        "orders",
        jsonPost({ planId, ...(demoCloneId ? {demoCloneId} : {}) }),
      );
      setCheckout(data);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  async function openOrder(id: string) {
    setError("");
    try {
      setCheckout(await api<NonNullable<typeof checkout>>(`orders?id=${id}`));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function cancelOrder() {
    if (!checkout) return;
    setError("");
    try {
      await api(`orders?id=${checkout.order.id}`, { method: "DELETE" });
      setCheckout(null);
      setNotice("Đã hủy đơn. Bạn có thể chọn gói khác.");
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setNotice("Đã sao chép.");
    } catch {
      setError("Không sao chép được. Bạn có thể chọn và sao chép trực tiếp.");
    }
  }
  const filtered = allVoices.filter(
    (v) =>
      (filter === "all" ||
        (filter === "mine" && v.kind === "clone") ||
        v.language === filter) &&
      (gender === "all" || v.gender === gender) &&
      `${v.name} ${v.description}`.toLowerCase().includes(search.toLowerCase()),
  );
  const pickerVoices = allVoices.filter(voice =>
    (!pickerMine || voice.kind === "clone") &&
    (pickerLanguage === "all" || voice.language === pickerLanguage) &&
    (pickerGender === "all" || voice.gender === pickerGender) &&
    `${voice.name} ${voice.description}`.toLocaleLowerCase("vi").includes(pickerSearch.trim().toLocaleLowerCase("vi")),
  );
  const todayJobs = (account?.jobs ?? []).filter((job) => {
    const created = new Date(job.created_at);
    const today = new Date();
    return (
      created.getFullYear() === today.getFullYear() &&
      created.getMonth() === today.getMonth() &&
      created.getDate() === today.getDate()
    );
  });
  const dismissNotice = useCallback(() => setNotice(""), []);

  return (
    <div className="voice-page">
      <audio
        ref={demoAudioRef}
        preload="none"
        onEnded={() => {
          const id = demoAuditionCloneId.current;
          const clone = visibleClones.find(c => c.id === id && c.status === "ready");
          if (clone?.is_demo) setHeardDemoIds(ids => ids.includes(clone.id) ? ids : [...ids, clone.id]);
          demoAuditionCloneId.current = null;
          setDemoPlaying("");
        }}
        onPause={() => setDemoPlaying("")}
        onError={() => {
          demoAuditionCloneId.current = null;
          setDemoPlaying("");
          setError("Chưa phát được mẫu giọng. Hãy bấm nghe thử lại.");
        }}
      />
      <audio className="voice-sr-only" ref={previewAudioRef} onEnded={() => setPreviewingId("")} onPause={() => setPreviewingId("")} />
      {notice && (
        <FeedbackToast
          message={notice}
          onClose={dismissNotice}
          title={
            notice.includes("Thanh toán")
              ? "Thanh toán thành công"
              : notice.includes("Giọng riêng")
                ? "Windi Clone Pro 3.0 đã sẵn sàng"
                : "Đã hoàn tất"
          }
        />
      )}
      <div className="voice-heading">
        <div>
          <span className="voice-eyebrow">
            <span /> WINDI AUDIO LAB
          </span>
          <h1>Voice Studio</h1>
          <p>Giọng clone như thật. Cảm xúc tự động theo ngữ cảnh.</p>
        </div>
        <div className="voice-header-art" aria-hidden="true">
          <div className="voice-tape">
            <div className="voice-tape-label">
              <span>WINDI MIXTAPE</span>
              <Music2 size={18} />
            </div>
            <div className="voice-tape-reels">
              <i />
              <div className="voice-wave">
                {Array.from({ length: 15 }, (_, i) => (
                  <b
                    key={i}
                    style={{
                      height: `${[12, 22, 16, 30, 38, 24, 46, 32, 20, 36, 25, 17, 29, 14, 8][i]}px`,
                    }}
                  />
                ))}
              </div>
              <i />
            </div>
            <small>SIDE A — YOUR NEXT STORY</small>
          </div>
          <span className="voice-art-note">made to be felt ↗</span>
        </div>
      </div>
      <VoiceComparisonShowcase
        onClone={() => {
          setTab("clone");
          requestAnimationFrame(() =>
            document.getElementById("voice-panel")?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            }),
          );
        }}
      />
      <section className="voice-workspace">
        <div className="voice-titlebar">
          <span>
            <AudioLines size={15} /> voice_studio.exe
          </span>
          <div>
            <span className="voice-model">CLONE PRO 3.0</span>
            <i />
            <i />
            <i />
          </div>
        </div>
        <div className="voice-workspace-shell">
        <aside className="voice-sidebar">
        <span className="voice-sidebar-label">PHÒNG THU CỦA BẠN</span>
        <div className="voice-tabs" role="tablist" aria-label="Voice Studio" aria-orientation={verticalNavigation ? "vertical" : "horizontal"}>
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              tabIndex={tab === t.id ? 0 : -1}
              onKeyDown={(event) => {
                const index = tabs.findIndex((item) => item.id === tab);
                const next =
                  event.key === "ArrowRight" || event.key === "ArrowDown"
                    ? (index + 1) % tabs.length
                    : event.key === "ArrowLeft" || event.key === "ArrowUp"
                      ? (index + tabs.length - 1) % tabs.length
                      : event.key === "Home"
                        ? 0
                        : event.key === "End"
                          ? tabs.length - 1
                          : -1;
                if (next >= 0) {
                  event.preventDefault();
                  setTab(tabs[next].id);
                  document
                    .getElementById(`voice-tab-${tabs[next].id}`)
                    ?.focus();
                }
              }}
              aria-selected={tab === t.id}
              aria-controls="voice-panel"
              id={`voice-tab-${t.id}`}
              onClick={() => {
                setTab(t.id);
                setError("");
                setNotice("");
              }}
            >
              <t.icon size={18} aria-hidden="true" />
              <span>{t.label}</span>
              {t.id === "clone" && cloneVoices.length > 0 && (
                <small>{cloneVoices.length}</small>
              )}
            </button>
          ))}
        </div>
        <div className="voice-sidebar-help">
          <Headphones size={22} aria-hidden="true" />
          <strong>Đầu tiên, thử một câu.</strong>
          <p>Chọn nội dung mẫu hoặc viết lời của bạn. Nghe kết quả rồi tải về.</p>
        </div>
        </aside>
        <div className="voice-main">
        <div className="voice-usage" role="region" aria-label="Thông tin tài khoản và credit">
          <div className="voice-usage-status">
            <span className="voice-status-dot" aria-hidden="true" />
            <div className="voice-usage-plan-badge">
              <span className="voice-usage-plan-text">
                {isLoading
                  ? "Đang tải tài khoản…"
                  : user
                    ? isAdmin
                      ? "Admin · Windi Clone Pro 3.0"
                      : currentPlan
                        ? `Gói ${currentPlan.name}`
                        : workflowBonusRemaining > 0
                          ? "3K credit từ Video Workflow"
                          : "Chưa có gói dịch vụ"
                    : "Không gian sáng tạo của bạn"}
              </span>
            </div>
          </div>
          <div className="voice-usage-actions">
            {user && (
              <div className="voice-credit-pill" title="Số credit khả dụng">
                <span className="voice-credit-icon" aria-hidden="true">
                  <Sparkles size={16} />
                </span>
                <div className="voice-credit-body">
                  <span className="voice-credit-val">
                    {isAdmin ? "Quota Windi Clone Pro 3.0" : formatNumber(remaining)}
                  </span>
                  <span className="voice-credit-label">
                    {isAdmin ? "quản trị" : "credit còn lại"}
                  </span>
                </div>
                {period && (
                  <span className="voice-credit-period" title={`Hạn dùng: ${date(period.ends_at)}`}>
                    <Clock3 size={13} aria-hidden="true" />
                    <span>đến {date(period.ends_at)}</span>
                  </span>
                )}
              </div>
            )}
            <button
              type="button"
              className="voice-plans-btn"
              onClick={() => setTab("plans")}
            >
              <span>
                {period || workflowBonusRemaining > 0
                  ? "Xem gói"
                  : "Khám phá các gói"}
              </span>
              <ArrowRight size={15} aria-hidden="true" />
            </button>
          </div>
        </div>
        {isAdmin && <VoiceAdminPanel onSelect={setSelected} />}
        {!catalogLoading && !available && (
          <div className="voice-notice">
            Studio đang được kết nối. Bạn có thể khám phá giao diện và các gói;
            tạo giọng và thanh toán sẽ mở khi dịch vụ sẵn sàng.
          </div>
        )}
        {!user && !isLoading && tab !== "create" && (
          <div className="voice-login-notice">
            <ShieldCheck size={17} />
            <span>
              Đăng nhập để quản lý credit, lưu audio và tạo giọng riêng.
            </span>
            <Link href="/login?next=/">
              Đăng nhập <ArrowRight size={14} />
            </Link>
          </div>
        )}
        {accountError && (
          <div className="voice-alert" role="alert">
            {accountError}
            <button onClick={() => void refresh()}>Thử lại</button>
          </div>
        )}
        {error && (
          <div className="voice-alert" role="alert">
            {error}
          </div>
        )}
        <div
          id="voice-panel"
          role="tabpanel"
          aria-labelledby={`voice-tab-${tab}`}
        >
          {tab === "create" && (
            <>
              <section className="voice-composer" aria-labelledby="voice-compose-title">
                <div className="voice-compose-heading">
                  <div>
                    <h2 id="voice-compose-title">Tạo âm thanh từ văn bản</h2>
                    <p>Chọn giọng bên dưới, rồi nhập nội dung bạn muốn đọc.</p>
                  </div>
                  <span className="voice-output-format"><Music2 size={15} aria-hidden="true" /> MP3</span>
                </div>
                <div className="voice-toolbar">
                  <div className="voice-toolbar-voice">
                    <label id="voice-choice-label" htmlFor="voice-choice">Giọng đọc</label>
                    <div className="voice-voice-control">
                      <span className="voice-avatar" aria-hidden="true"><AudioLines size={20} /></span>
                      <button id="voice-choice" type="button" className="voice-choice-trigger" aria-labelledby="voice-choice-label voice-choice-name" aria-haspopup="dialog" aria-expanded={voicePickerOpen} aria-controls="voice-picker" onClick={() => {
                        stopPreview();
                        setError("");
                        setPickerSearch("");
                        setPickerLanguage("all");
                        setPickerGender("all");
                        setPickerMine(false);
                        voicePickerRef.current?.showModal();
                        setVoicePickerOpen(true);
                      }}>
                        <span id="voice-choice-name">{selected.name}</span>
                        <ChevronDown size={17} aria-hidden="true" />
                      </button>
                      {selected.kind === "public" && <button type="button" className="voice-toolbar-preview" disabled={!!previewLoadingId} aria-label={`Nghe thử giọng ${selected.name}`} aria-pressed={previewingId === selected.id} onClick={() => void previewVoice(selected)}>
                        {previewLoadingId === selected.id ? <LoaderCircle size={17} className="voice-spin" /> : previewingId === selected.id ? <Pause size={17} /> : <Play size={17} />}
                      </button>}
                    </div>
                  </div>
                  <label className="voice-toolbar-field" htmlFor="voice-language">
                    Ngôn ngữ
                    <select id="voice-language" value={language} onChange={event => setLanguage(event.target.value)}>
                      {VOICE_LANGUAGES.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  </label>
                  <label className="voice-toolbar-field" htmlFor="voice-speed">
                    Tốc độ đọc
                    <select id="voice-speed" value={speed} onChange={event => setSpeed(Number(event.target.value))}>
                      <optgroup label="Đọc chậm hơn">
                        {Array.from({ length: 8 }, (_, i) => Number((0.6 + i * 0.05).toFixed(2))).map(value => <option key={value} value={value}>{value.toFixed(2)}×</option>)}
                      </optgroup>
                      <option value={1}>1× · Chuẩn</option>
                      <optgroup label="Đọc nhanh hơn">
                        {Array.from({ length: 10 }, (_, i) => Number((1.05 + i * 0.05).toFixed(2))).map(value => <option key={value} value={value}>{value.toFixed(2)}×</option>)}
                      </optgroup>
                    </select>
                  </label>
                  <button className="voice-btn voice-library-link" onClick={() => setTab("voices")}><Headphones size={16} aria-hidden="true" /> Thư viện giọng</button>
                </div>
                <div className="voice-script">
                  <label htmlFor="voice-text">Nội dung cần đọc</label>
                  <textarea id="voice-text" value={text} onChange={event => {
                    setText(event.target.value);
                    requestKey.current = null;
                  }} placeholder="Nhập hoặc dán nội dung vào đây… Giọng đọc sẽ tự điều chỉnh cảm xúc theo lời bạn viết." maxLength={MAX_WEB_GENERATION_CHARACTERS * 2} aria-describedby="voice-character-count voice-generate-hint" />
                  <div className="voice-script-tools">
                    <span id="voice-character-count" className={credits > MAX_WEB_GENERATION_CHARACTERS ? "voice-over-limit" : ""}>{formatNumber(credits)} / {formatNumber(MAX_WEB_GENERATION_CHARACTERS)} ký tự</span>
                    <button disabled={!text || !!busy} onClick={() => { setText(""); requestKey.current = null; }}>Xóa nội dung</button>
                  </div>
                </div>
                <div className="voice-compose-bottom">
                  <div className="voice-compose-examples">
                    <span>Chưa có ý tưởng? Thử nội dung mẫu</span>
                    <div>{samples.map(sample => <button key={sample.label} onClick={() => { setText(sample.text); requestKey.current = null; document.getElementById("voice-text")?.focus(); }}><Plus size={14} aria-hidden="true" />{sample.label}</button>)}</div>
                  </div>
                  <div className="voice-create-action">
                    {user ? <button className="voice-btn voice-primary" disabled={!canGenerate} onClick={() => void generate()}>
                      {busy === "generate" ? <LoaderCircle size={18} className="voice-spin" /> : <AudioLines size={18} aria-hidden="true" />}
                      {busy === "generate" ? "Đang tạo âm thanh…" : "Tạo âm thanh"}
                      <span>{formatNumber(credits)} credit</span>
                    </button> : <Link className="voice-btn voice-primary" href="/login?next=/">Đăng nhập để tạo âm thanh <ArrowRight size={17} aria-hidden="true" /></Link>}
                    <span>1 ký tự = 1 credit</span>
                  </div>
                </div>
                <p id="voice-generate-hint" className="voice-compose-hint" role="status">
                  {credits > MAX_WEB_GENERATION_CHARACTERS ? "Tối đa 5.000 ký tự mỗi lần." : !text.trim() ? "Nhập nội dung; đoạn dài sẽ tự chia theo câu và ghép thành một file MP3." : user && !available ? "Dịch vụ đang kết nối. Vui lòng thử lại sau ít phút." : !isAdmin && user && credits > largestBalance ? <>Bạn chưa đủ credit cho đoạn này. Rút ngắn nội dung hoặc <button onClick={() => setTab("plans")}>xem gói dịch vụ</button>.</> : "Nội dung dài được tự chia theo câu, giữ cùng giọng và ghép thành một file MP3. Quá trình này có thể mất vài phút."}
                </p>
                <details className="voice-advanced">
                  <summary><SlidersHorizontal size={15} aria-hidden="true" /> Thông tin cho lập trình viên <ChevronDown size={14} aria-hidden="true" /></summary>
                  <VoiceId id={selected.id} />
              {VOICE_API_ENABLED ? <Link href={`/account?voice=${encodeURIComponent(selected.id)}#api`}>API key và hướng dẫn kết nối <ArrowRight size={14} aria-hidden="true" /></Link> : <p className="voice-hint">API đang tạm ngưng. Bạn vẫn có thể tạo giọng trực tiếp trên Voice Studio.</p>}
                </details>
              </section>
              <section className="voice-today" aria-labelledby="voice-today-title">
                <div className="voice-today-heading">
                  <div>
                    <span className="voice-step">BẢN GHI HÔM NAY</span>
                    <h3 id="voice-today-title">Âm thanh đã tạo hôm nay</h3>
                  </div>
                  <span>{todayJobs.length} bản ghi</span>
                </div>
                {todayJobs.length ? (
                  <div className="voice-today-list">
                    {todayJobs.map((job) => (
                      <article key={job.id}>
                        <span className="voice-history-icon"><Music2 size={19} /></span>
                        <div>
                          <strong>{job.transcript.slice(0, 100)}{job.transcript.length > 100 ? "…" : ""}</strong>
                          <small>{job.voice_name} · {new Date(job.created_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} · {formatNumber(job.credits)} credit</small>
                        </div>
                        {job.status === "ready" ? (
                          <div className="voice-today-actions">
                            <button
                              className={`voice-btn ${playingJobId === job.id ? "voice-primary" : ""}`}
                              disabled={!!busy && busy !== job.id}
                              onClick={() => void listen(job.id)}
                            >
                              {busy === job.id ? (
                                <LoaderCircle size={15} className="voice-spin" />
                              ) : playingJobId === job.id ? (
                                <Pause size={15} />
                              ) : (
                                <Play size={15} />
                              )}
                              {busy === job.id ? "Đang tải…" : playingJobId === job.id ? "Dừng" : "Nghe"}
                            </button>
                            <a className="voice-btn" href={`/api/voice/audio?id=${job.id}&download=1`} download="windi-voice.mp3" target="_blank" rel="noreferrer"><ArrowDownToLine size={15} /> Tải MP3</a>
                          </div>
                        ) : (
                          <span className={`voice-job-status voice-job-${job.status}`}>{statusName(job.status)}</span>
                        )}
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="voice-today-empty">Các bản ghi tạo trong hôm nay sẽ xuất hiện tại đây. Lịch sử được giữ tối đa 7 ngày.</p>
                )}
              </section>
            </>
          )}
          {tab === "voices" && (
            <section className="voice-tab-body">
              <div className="voice-section-heading">
                <div>
                  <span className="voice-step">VOICE LIBRARY</span>
                  <h2>Tìm tiếng nói cho câu chuyện.</h2>
                  <p>
                    Chọn giọng trong thư viện hoặc giọng riêng bạn đã tạo.
                  </p>
                </div>
                <div className="voice-library-actions">
                  <button
                    className="voice-btn voice-library-clone-shortcut"
                    aria-pressed={filter === "mine"}
                    onClick={() => {
                      setSearch("");
                      setGender("all");
                      setFilter("mine");
                      requestAnimationFrame(() =>
                        document.getElementById("voice-library-list")?.scrollIntoView({
                          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
                          block: "start",
                        }),
                      );
                    }}
                  >
                    <Mic2 size={16} aria-hidden="true" />
                    Giọng của tôi
                  </button>
                  <button
                    className="voice-btn"
                    onClick={() => void loadVoices()}
                    disabled={catalogLoading}
                  >
                    <RefreshCw
                      size={16}
                      className={catalogLoading ? "voice-spin" : ""}
                    />
                    Làm mới
                  </button>
                </div>
              </div>
              <div className="voice-filters">
                <label className="voice-search">
                  <Search size={17} />
                  <input
                    aria-label="Tìm giọng"
                    placeholder="Tìm tên hoặc mô tả giọng…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </label>
                <select
                  aria-label="Ngôn ngữ giọng"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <option value="all">Mọi ngôn ngữ mẫu</option>
                  <option value="mine">Giọng của tôi</option>
                  {VOICE_LIBRARY_LANGUAGES.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Chất giọng"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                >
                  <option value="all">Mọi chất giọng</option>
                  <option value="feminine">Nữ</option>
                  <option value="masculine">Nam</option>
                  <option value="gender_neutral">Trung tính</option>
                </select>
              </div>
              <div className="voice-library-count" id="voice-library-list" aria-live="polite">
                {catalogLoading
                  ? "Đang tải thư viện…"
                  : `${filtered.length} giọng có sẵn`}
              </div>
              <div className="voice-grid">
                {filtered.map((v, i) => (
                  <article className="voice-card" key={v.id}>
                    <div className="voice-card-top">
                      <span className={`voice-avatar voice-avatar-${i % 4}`}>
                        <AudioLines size={25} />
                      </span>
                      <div className="voice-card-top-meta">
                        <VoiceMetadata voice={v} />
                        <span className="voice-chip">
                          {v.kind === "clone"
                            ? "CỦA BẠN"
                            : v.language.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <h3>{v.name}</h3>
                    <p>
                      {v.description || "Giọng đọc từ thư viện Windi Clone Pro 3.0."}
                    </p>
                    <div className="voice-card-actions">
                      {v.kind === "public" && (
                        <button
                          className="voice-btn voice-preview-btn"
                          aria-pressed={previewingId === v.id}
                          disabled={!!previewLoadingId}
                          onClick={() => void previewVoice(v)}
                        >
                          {previewLoadingId === v.id ? (
                            <LoaderCircle size={15} className="voice-spin" />
                          ) : previewingId === v.id ? (
                            <Pause size={15} />
                          ) : (
                            <Play size={15} />
                          )}{" "}
                          {previewLoadingId === v.id
                            ? "Đang tải"
                            : previewingId === v.id
                              ? "Dừng"
                              : "Nghe thử"}
                        </button>
                      )}
                      <button className="voice-btn" onClick={() => choose(v)}>
                        {selected.id === v.id ? (
                          <Check size={15} />
                        ) : (
                          <Plus size={15} />
                        )}{" "}
                        {selected.id === v.id ? "Đang chọn" : "Sử dụng"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
              {!filtered.length && !catalogLoading && (
                <Empty
                  icon={Search}
                  title={filter === "mine" ? "Bạn chưa có giọng đã clone" : "Chưa tìm thấy giọng phù hợp"}
                  text={filter === "mine" ? "Các giọng bạn tạo sẽ hiển thị tại đây." : "Thử đổi bộ lọc hoặc tìm bằng một tên khác."}
                />
              )}
            </section>
          )}
          {tab === "clone" && (
            <section className="voice-tab-body">
              <div className="voice-section-heading">
                <div>
                  <span className="voice-step">YOUR VOICE, REIMAGINED</span>
                  <h2>Giữ lại chất giọng của bạn.</h2>
                  <p>
                    Một mẫu ghi âm rõ tiếng. Một giọng đọc mang dấu ấn riêng.
                  </p>
                </div>
                <span className="voice-quota">
                  {isAdmin ? `${activeCloneCount} giọng · quota Windi Clone Pro 3.0` : period?.clone_limit
                    ? `${activeCloneCount} / ${period.clone_limit} giọng đang hoạt động` : user ? "Mua gói 39.000₫ để mở 1 slot giọng" : "Đăng nhập và mua gói để tạo giọng riêng"}
                </span>
              </div>
              {user && account && !isAdmin && !period?.clone_limit ? (
                <div className="voice-clone-unlock">
                  <div><strong>Cần mua gói trước khi tạo giọng</strong><p>Gói 10.000 credit giá 39.000₫ mở 1 slot giọng clone trong 30 ngày.</p></div>
                  <button className="voice-btn" onClick={() => setTab("plans")}>Xem gói 39.000₫ <ArrowRight size={15} /></button>
                </div>
              ) : (
                <div className="voice-clone-layout">
                  <form className="voice-clone-form" onSubmit={cloneVoice}>
                    <label>
                      Tên giọng
                      <input
                        required
                        maxLength={80}
                        placeholder="Ví dụ: Giọng kể chuyện của tôi"
                        value={cloneName}
                        onChange={(e) => {
                          setCloneName(e.target.value);
                          cloneKey.current = null;
                        }}
                      />
                    </label>
                    <label>
                      Ngôn ngữ mẫu
                      <select
                        value={cloneLanguage}
                        onChange={(e) => {
                          setCloneLanguage(e.target.value);
                          cloneKey.current = null;
                        }}
                      >
                        {VOICE_LANGUAGES.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Vùng giọng (không bắt buộc)
                      <select
                        value={cloneAccent}
                        disabled={accentLoading || !cloneAccents.length}
                        onChange={(e) => {
                          setCloneAccent(e.target.value);
                          cloneKey.current = null;
                        }}
                      >
                        <option value="">
                          {accentLoading
                            ? "Đang tải vùng giọng…"
                            : cloneAccents.length
                              ? "Tự nhận theo mẫu ghi âm"
                              : "Tự nhận theo mẫu ghi âm"}
                        </option>
                        {cloneAccents.map((accent) => (
                          <option key={accent.id} value={accent.id}>
                            {accent.name} · {accent.locale}
                          </option>
                        ))}
                      </select>
                      <span className="voice-field-hint">
                        Để mặc định nếu bạn chưa chắc. Chất giọng dựa trên mẫu ghi âm của bạn.
                      </span>
                    </label>
                    <label className="voice-upload">
                      <Upload size={30} />
                      <strong>
                        {clip ? clip.name : "Chọn file ghi âm của bạn"}
                      </strong>
                      <span>MP3, WAV, FLAC, OGG, WebM · tối đa 3 MB · 60 giây</span>
                      <input
                        type="file"
                        ref={clipInputRef}
                        accept=".mp3,.wav,.flac,.ogg,.webm"
                        onChange={async (e) => {
                          const input = e.currentTarget;
                          const file = input.files?.[0] || null;
                          const validation = ++clipValidation.current;
                          cloneKey.current = null;
                          setClip(null);
                          setClipDuration(null);
                          setClipChecking(false);
                          setError("");
                          if (!file) {
                            return;
                          }
                          if (file.size > VOICE_CLONE_CLIP_LIMITS.maxBytes) {
                            setError("Mẫu ghi âm tối đa 3 MB.");
                            input.value = "";
                            return;
                          }
                          setClipChecking(true);
                          try {
                            const duration = await readClipDuration(file);
                            if (validation !== clipValidation.current) return;
                            if (duration > MAX_CLONE_CLIP_SECONDS) {
                              setError("Mẫu ghi âm tối đa 60 giây. Hãy cắt ngắn file rồi tải lại.");
                              input.value = "";
                              return;
                            }
                            setClipDuration(duration);
                            setClip(file);
                          } catch (error) {
                            if (validation === clipValidation.current) {
                              setError((error as Error).message);
                              input.value = "";
                            }
                          } finally {
                            if (validation === clipValidation.current) setClipChecking(false);
                          }
                        }}
                      />
                    </label>
                    {clipChecking && (
                      <span className="voice-field-hint">Đang kiểm tra thời lượng file…</span>
                    )}
                    {clipDuration !== null && (
                      <span className="voice-field-hint">
                        Thời lượng {formatClipDuration(clipDuration)} giây / tối đa 60 giây.
                      </span>
                    )}
                    {clipUrl && (
                      <audio
                        aria-label="Nghe mẫu giọng của bạn"
                        src={clipUrl}
                        controls
                        preload="metadata"
                      />
                    )}
                    <section className="voice-usage-note" aria-labelledby="voice-usage-title">
                      <h3 id="voice-usage-title">Sử dụng giọng clone có trách nhiệm</h3>
                      <p>
                        Chỉ tạo giọng clone từ giọng nói của chính bạn hoặc khi có
                        sự đồng ý rõ ràng của chủ giọng cho việc tạo và sử dụng
                        giọng AI. Bạn cần có quyền sử dụng bản ghi âm tải lên.
                      </p>
                      <p>
                        Khi sử dụng cho mục đích thương mại, hãy bảo đảm quyền
                        sử dụng giọng nói và bản ghi âm bao gồm phạm vi thương mại;
                        lưu giữ thỏa thuận hoặc giấy phép liên quan để hạn chế
                        tranh chấp về bản quyền và quyền cá nhân.
                      </p>
                      <p>
                        Không dùng giọng clone để mạo danh, lừa đảo, gây hiểu lầm
                        hoặc xâm phạm quyền, lợi ích hợp pháp của người khác.
                        Bạn chịu trách nhiệm về nội dung tạo ra và việc sử dụng
                        phù hợp với pháp luật hiện hành.
                      </p>
                    </section>
                    <label className="voice-consent">
                      <input
                        type="checkbox"
                        required
                        checked={consent}
                        onChange={(e) => setConsent(e.target.checked)}
                      />
                      <span>
                        Tôi là chủ giọng nói hoặc đã được chủ giọng cho phép tạo
                        và sử dụng giọng AI, đồng thời có quyền sử dụng bản ghi âm
                        tải lên. Tôi đã đọc chú thích trên và đồng ý gửi mẫu để
                        Windi Clone Pro 3.0 xử lý.
                      </span>
                    </label>
                    <button
                      className="voice-btn voice-primary"
                      disabled={
                        !user ||
                        !available ||
                        !canClone ||
                        !clip ||
                        clipChecking ||
                        clipDuration === null ||
                        !consent ||
                        !cloneName.trim() ||
                        !!busy
                      }
                    >
                      {busy === "clone" ? (
                        <LoaderCircle size={17} className="voice-spin" />
                      ) : (
                        <Mic2 size={17} />
                      )}{" "}
                      {busy === "clone"
                        ? "Đang clone giọng…"
                        : "Tạo giọng riêng"}
                    </button>
                  </form>
                  <aside className="voice-clone-guide">
                    <details className="voice-clone-guide-details">
                      <summary className="voice-clone-guide-summary">
                        <span><Mic2 size={15} /> 3 mẹo thu âm để giọng clone chuẩn</span>
                        <ChevronDown size={14} />
                      </summary>
                      <div className="voice-clone-guide-content">
                        <span className="voice-guide-icon">
                          <Mic2 size={36} />
                        </span>
                        <h3>Mẫu tốt, giọng tự nhiên hơn.</h3>
                        <ol>
                          <li>
                            <strong>Thu khoảng 10–30 giây</strong>
                            <p>
                              Một người nói liên tục, với ngữ điệu bạn muốn giữ.
                            </p>
                          </li>
                          <li>
                            <strong>Giữ không gian yên tĩnh</strong>
                            <p>Không nhạc nền, tiếng vọng hay giọng người khác.</p>
                          </li>
                          <li>
                            <strong>Nói như chính bạn</strong>
                            <p>Đọc rõ ràng, giữ âm lượng đều và không thì thầm.</p>
                          </li>
                        </ol>
                        <div className="voice-private">
                          <ShieldCheck size={20} />
                          <span>
                            Giọng clone được lưu riêng cho tài khoản của bạn.
                          </span>
                        </div>
                      </div>
                    </details>
                  </aside>
                </div>
              )}
              <div className="voice-section-heading voice-my-clones">
                <div>
                  <h2 ref={cloneResultsRef} tabIndex={-1} className="voice-clone-results-title">
                    Giọng của tôi <small>({visibleClones.length})</small>
                  </h2>
                  <p>
                    Xóa giọng sẽ giải phóng slot clone, nhưng không hoàn credit
                    đã dùng.
                  </p>
                </div>
                <button className="voice-btn" onClick={() => void refresh()}>
                  <RefreshCw size={15} />
                  Làm mới
                </button>
              </div>
              {!visibleClones.length ? (
                <Empty
                  icon={Mic2}
                  title="Một giọng nói đang chờ được tạo"
                  text="Giọng clone của bạn sẽ xuất hiện ở đây."
                />
              ) : (
                <div className="voice-grid">
                  {visibleClones.map((c) => (
                    <article className="voice-card" key={c.id}>
                      <span className="voice-avatar">
                        <Mic2 size={23} />
                      </span>
                      <h3>{c.name}</h3>
                      {c.status==='ready' && !c.is_demo && <details className="voice-advanced"><summary>Thông tin cho lập trình viên <ChevronDown size={14} aria-hidden="true" /></summary><VoiceId id={c.provider_id}/></details>}
                      <p>
                        {c.language.toUpperCase()}
                        {c.accent ? ` · ${c.accent}` : ""} ·{" "}
                        {c.status === "failed"
                          ? "Thất bại · đã hoàn lượt"
                          : statusName(c.status)}
                      </p>
                      {c.is_demo && c.demo_expires_at && <p className="voice-demo-expiry">Giọng nghe thử được giữ trong {Math.max(0, Math.ceil((Date.parse(c.demo_expires_at) - demoNow) / 60000))} phút nữa.</p>}
                      {c.status === "ready" && (
                        <>
                          <div className="voice-demo-samples">
                            {(c.is_demo ? ["greeting", "news"] : ["paid"]).map(preset => {
                              const key = `${c.id}:${preset}`;
                              return <div key={key}>
                                <p>{VOICE_CLONE_DEMO_SAMPLES[preset as VoiceCloneSample]}</p>
                                <button type="button" className="voice-btn voice-preview-btn" disabled={!!demoLoading} aria-pressed={demoPlaying === key} aria-busy={demoLoading === key} onClick={() => void previewClone(c, preset as VoiceCloneSample)}>
                                  {demoLoading === key ? <LoaderCircle size={15} className="voice-spin" /> : demoPlaying === key ? <Pause size={15} /> : <Play size={15} />}
                                  {demoLoading === key ? "Đang tạo mẫu…" : demoPlaying === key ? "Dừng" : preset === "news" ? "Nghe mẫu tin tức" : "Nghe mẫu chào mừng"}
                                </button>
                              </div>;
                            })}
                          </div>
                          <div className="voice-card-actions">
                            {c.is_demo ? heardDemoIds.includes(c.id) ? <div className="voice-demo-offer" role="status">
                              <strong>Ưng giọng này rồi?</strong>
                              <p>Giữ giọng riêng và nhận 10.000 credit để tạo nội dung trong 30 ngày.</p>
                              <button className="voice-btn voice-primary" disabled={!!busy || !payments || !available} onClick={() => void purchase("credit_10k", c.id)}>
                                Sử dụng giọng này với gói 39k <ArrowRight size={14} />
                              </button>
                            </div> : <p className="voice-demo-next">Nghe hết một đoạn mẫu để tiếp tục với giọng này.</p> : <button className="voice-btn" onClick={() => choose(cloneVoices.find(v => v.id === c.provider_id)!)}>Sử dụng <ArrowRight size={14} /></button>}
                            <button className="voice-icon-btn" aria-label={`Xóa giọng ${c.name}`} disabled={!!busy} onClick={() => void removeClone(c.id)}><Trash2 size={16} /></button>
                          </div>
                        </>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}
          {tab === "history" && (
            <section className="voice-tab-body">
              <div className="voice-section-heading">
                <div>
                  <span className="voice-step">YOUR AUDIO SHELF</span>
                  <h2>Những câu chuyện đã thành tiếng.</h2>
                  <p>Nghe lại và tải về trong 7 ngày. Sau đó bản ghi được xóa tự động để bảo vệ dung lượng.</p>
                </div>
                <button className="voice-btn" onClick={() => void refresh()}>
                  <RefreshCw size={16} />
                  Làm mới
                </button>
              </div>
              {!account?.jobs.length ? (
                <Empty
                  icon={FileAudio}
                  title="Kệ âm thanh còn trống"
                  text="Bắt đầu với một đoạn văn. Bản ghi đầu tiên của bạn sẽ được lưu tại đây."
                  action={() => setTab("create")}
                  actionLabel="Tạo giọng đầu tiên"
                />
              ) : (
                <div className="voice-history">
                  {account.jobs.map((j) => (
                    <div
                      className={`voice-history-item${audio?.id === j.id ? " is-open" : ""}`}
                      key={j.id}
                    >
                      <article>
                        <span className="voice-history-icon">
                          <Music2 size={21} />
                        </span>
                        <div>
                          <strong>
                            {j.transcript.slice(0, 90)}
                            {j.transcript.length > 90 ? "…" : ""}
                          </strong>
                          <small>
                            {j.voice_name} · {date(j.created_at)} ·{" "}
                            {formatNumber(j.credits)} credit
                          </small>
                          <span
                            className={`voice-job-status voice-job-${j.status}`}
                          >
                            {statusName(j.status)}
                          </span>
                        </div>
                        {j.status === "ready" && (
                          <button
                            className={`voice-btn ${playingJobId === j.id ? "voice-primary" : ""}`}
                            disabled={!!busy && busy !== j.id}
                            onClick={() => void listen(j.id)}
                          >
                            {busy === j.id ? (
                              <LoaderCircle size={15} className="voice-spin" />
                            ) : playingJobId === j.id ? (
                              <Pause size={15} />
                            ) : (
                              <Play size={15} />
                            )}
                            {busy === j.id ? "Đang tải…" : playingJobId === j.id ? "Dừng" : "Nghe / tải"}
                          </button>
                        )}
                      </article>
                      {audio?.id === j.id && (
                        <div className="voice-history-player">
                          <span className="voice-player-icon">
                            <AudioLines size={24} />
                          </span>
                          <div className="voice-player-title">
                            <strong>Bản ghi của bạn</strong>
                            <small>MP3 · sẵn sàng để sử dụng</small>
                          </div>
                          <audio
                            key={audio.url}
                            ref={jobAudioRef}
                            src={audio.url}
                            controls
                            autoPlay
                            preload="auto"
                            aria-label="Bản ghi đã tạo"
                            onPlay={() => setPlayingJobId(audio.id)}
                            onPause={() => {
                              if (playingJobId === audio.id) setPlayingJobId(null);
                            }}
                            onEnded={() => setPlayingJobId(null)}
                            onCanPlay={(e) => {
                              void e.currentTarget.play().catch(() => {});
                            }}
                            onError={() =>
                              setError(
                                "Liên kết nghe đã hết hạn hoặc không tải được. Mở lại bản ghi từ Lịch sử.",
                              )
                            }
                          />
                          <a
                            href={`/api/voice/audio?id=${audio.id}&download=1`}
                            download="windi-voice.mp3"
                            target="_blank"
                            rel="noreferrer"
                            className="voice-btn"
                          >
                            <ArrowDownToLine size={16} />
                            Tải MP3
                          </a>
                          <button
                            className="voice-icon-btn"
                            aria-label="Đóng trình nghe"
                            onClick={() => {
                              stopJobAudio();
                              setAudio(null);
                            }}
                          >
                            <X size={17} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <p className="voice-hint">
                Bản ghi âm, timestamp và nội dung sẽ được xóa sau 7 ngày. Yêu cầu chờ đối soát vẫn tạm giữ credit.{" "}
                <Link href="/support">Liên hệ hỗ trợ</Link> nếu trạng thái chưa
                được cập nhật.
              </p>
            </section>
          )}
          {tab === "plans" && (
            <section className="voice-tab-body">
              <div className="voice-plans-intro">
                <span className="voice-step">A LITTLE PLAN. A LOT TO SAY.</span>
                <h2>Chọn không gian cho tiếng nói của bạn.</h2>
                <p>Chọn một trong ba gói credit, thanh toán một lần và không tự động gia hạn. Credit có hiệu lực trong 30 ngày.</p>
              </div>
              <div className="voice-plans-mobile-selector" role="tablist" aria-label="Chọn gói cước">
                {VOICE_PLANS.filter((p) => p.purchasable).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    role="tab"
                    aria-selected={activePlanId === p.id}
                    className={`voice-plan-tab-btn ${activePlanId === p.id ? "is-active" : ""}`}
                    onClick={() => setActivePlanId(p.id)}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
              <div className="voice-plans">
                {VOICE_PLANS.filter((p) => p.purchasable).map((p, i) => {
                  const featured = p.id === "credit_100k";
                  const isCurrent = currentPlan?.id === p.id;
                  const canBuy = p.purchasable;
                  return (
                    <article
                      className={`voice-plan ${featured ? "voice-plan-featured" : ""} ${activePlanId === p.id ? "is-mobile-active-plan" : ""}`}
                      key={p.id}
                    >
                      {featured && (
                        <span className="voice-popular">PHỔ BIẾN NHẤT</span>
                      )}
                      <span className="voice-plan-index">
                        0{i + 1} / {p.id.toUpperCase()}
                      </span>
                      <h3>{p.name}</h3>
                      <p>{p.description}</p>
                      <div className="voice-price">
                        {p.price_vnd ? formatNumber(p.price_vnd) : "Miễn phí"}
                        <span>
                          {p.price_vnd
                            ? `đ / ${p.billing === "monthly" ? "tháng" : "một lần"}`
                            : "cho tài khoản mới"}
                        </span>
                      </div>
                      <div className="voice-plan-allowance">
                        <strong>{formatNumber(p.credits)}</strong> credit /{" "}
                        {p.duration_days} ngày
                      </div>
                      <ul>
                        <li>
                          <Check size={15} />
                          {p.clone_limit
                            ? `${p.clone_limit} slot giọng clone đang hoạt động`
                            : "Dùng thư viện giọng có sẵn"}
                        </li>
                        <li>
                          <Check size={15} />
                          {p.id === "credit_1m"
                            ? "Chỉ tạo trực tiếp trên Voice Studio"
                            : p.clone_limit
                              ? "Xóa giọng để giải phóng slot"
                              : "Không cần thanh toán để bắt đầu"}
                        </li>
                        <li>
                          <Check size={15} />
                          Windi Clone Pro 3.0 · xuất file MP3
                        </li>
                        <li>
                          <Check size={15} />
                          Lưu lịch sử và tải âm thanh
                        </li>
                      </ul>
                      {!user ? (
                        <Link
                          href="/login?next=/"
                          className={`voice-btn ${featured ? "voice-primary" : ""}`}
                        >
                          Đăng nhập để chọn gói
                          <ArrowRight size={15} />
                        </Link>
                      ) : (
                        <button
                          className={`voice-btn ${featured ? "voice-primary" : ""}`}
                          disabled={
                            !!busy || !canBuy || !payments || !available
                          }
                          onClick={() => void purchase(p.id)}
                        >
                          {busy === p.id ? (
                            <LoaderCircle className="voice-spin" size={16} />
                          ) : isCurrent ? (
                            period?.plan_id !== "welcome" && canBuy
                              ? "Mua chu kỳ kế tiếp"
                              : "Gói hiện tại"
                          ) : !p.purchasable ? (
                            "Tự cấp khi đăng ký"
                          ) : !canBuy ? (
                            "Chưa đủ điều kiện mua"
                          ) : !payments || !available ? (
                            "Sắp mở thanh toán"
                          ) : period && period.plan_id !== "welcome" ? (
                            `Mua tiếp ${p.name}`
                          ) : (
                            `Chọn ${p.name}`
                          )}
                          {canBuy && payments && available && (
                            <ArrowRight size={15} />
                          )}
                        </button>
                      )}
                    </article>
                  );
                })}
              </div>
              {account?.nextPeriod && (
                <div className="voice-plan-notes">
                  <p>
                    <strong>Gói tiếp theo đã được xếp lịch</strong>
                    {VOICE_PLANS.find((plan) => plan.id === account.nextPeriod?.plan_id)?.name}
                    {" "}bắt đầu ngày {date(account.nextPeriod.starts_at)}.
                  </p>
                </div>
              )}
              <div className="voice-plan-notes">
                <p>
                  <strong>Credit tính thế nào?</strong> 1 ký tự = 1 credit, gồm
                  dấu câu và khoảng trắng. Mỗi gói dùng trong 30 ngày, không tự
                  gia hạn; nếu mua khi đang có gói, gói mới bắt đầu sau gói hiện
                  tại và credit không cộng dồn.
                </p>
                <p>
                  <strong>Giọng clone khi gói hết hạn?</strong> Giọng được giữ
                  lại trong thư viện. Gói hết hạn vẫn có thể tải các audio đã tạo.
                </p>
              </div>
              <Link className="voice-btn" href="/account">Hồ sơ, đơn hàng và API key →</Link>
              <VoiceApiTokens enabled={!!user} apiEnabled={VOICE_API_ENABLED} />
              {!!account?.orders.length && (
                <>
                  <h3 className="voice-orders-title">Đơn hàng của bạn</h3>
                  <div className="voice-orders">
                    {account.orders.map((o) => (
                      <button key={o.id} onClick={() => void openOrder(o.id)}>
                        <span>
                          <strong>
                            {VOICE_PLANS.find((p) => p.id === o.plan_id)?.name}
                          </strong>
                          <small>{o.payment_code}</small>
                        </span>
                        <span>{formatNumber(o.amount_vnd)}đ</span>
                        <span>
                          {o.status === "pending"
                            ? Date.parse(o.expires_at) <= Date.now()
                              ? "Hết hạn"
                              : "Chờ thanh toán"
                            : statusName(o.status)}{" "}
                          <ArrowRight size={14} />
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </section>
          )}
        </div>
        {audio &&
          (tab !== "history" ||
            !account?.jobs.some((job) => job.id === audio.id)) && (
          <div className="voice-player">
            <span className="voice-player-icon">
              <AudioLines size={26} />
            </span>
            <div className="voice-player-title">
              <strong>Bản ghi của bạn</strong>
              <small>MP3 · sẵn sàng để sử dụng</small>
            </div>
            <audio
              key={audio.url}
              ref={jobAudioRef}
              src={audio.url}
              controls
              autoPlay
              preload="auto"
              aria-label="Bản ghi đã tạo"
              onPlay={() => setPlayingJobId(audio.id)}
              onPause={() => {
                if (playingJobId === audio.id) setPlayingJobId(null);
              }}
              onEnded={() => setPlayingJobId(null)}
              onCanPlay={(e) => {
                void e.currentTarget.play().catch(() => {});
              }}
              onError={() =>
                setError(
                  "Liên kết nghe đã hết hạn hoặc không tải được. Mở lại bản ghi từ Lịch sử.",
                )
              }
            />
            <a
              href={`/api/voice/audio?id=${audio.id}&download=1`}
              download="windi-voice.mp3"
              target="_blank"
              rel="noreferrer"
              className="voice-btn"
            >
              <ArrowDownToLine size={16} />
              Tải MP3
            </a>
            <button
              className="voice-icon-btn"
              aria-label="Đóng trình nghe"
              onClick={() => {
                stopJobAudio();
                setAudio(null);
              }}
            >
              <X size={17} />
            </button>
          </div>
        )}
        </div>
        </div>
      </section>
      <div className="voice-bottom-note">
        <span>
          <ShieldCheck size={15} /> Giọng riêng tư. Credit rõ ràng.
        </span>
        <Link href="/support">
          Bạn cần hỗ trợ? <ArrowRight size={14} />
        </Link>
      </div>
      <dialog
        ref={voicePickerRef}
        id="voice-picker"
        className="voice-picker"
        aria-labelledby="voice-picker-title"
        aria-describedby="voice-picker-description"
        onClose={() => { stopPreview(); setVoicePickerOpen(false); }}
        onClick={event => { if (event.target === event.currentTarget) voicePickerRef.current?.close(); }}
      >
        <div className="voice-picker-header">
          <div>
            <h2 id="voice-picker-title">Chọn giọng đọc</h2>
            <p id="voice-picker-description">Tìm giọng phù hợp, nghe thử rồi chọn để bắt đầu.</p>
          </div>
          <button type="button" className="voice-icon-btn" aria-label="Đóng bộ chọn giọng" onClick={() => voicePickerRef.current?.close()}><X size={20} aria-hidden="true" /></button>
        </div>
        <div className="voice-picker-tools">
          <label className="voice-search">
            <Search size={18} aria-hidden="true" />
            <input autoFocus aria-label="Tìm giọng trong popup" placeholder="Tìm tên hoặc mô tả giọng…" value={pickerSearch} onChange={event => setPickerSearch(event.target.value)} />
          </label>
          <div className="voice-picker-filters">
            <label>Ngôn ngữ<select value={pickerLanguage} onChange={event => setPickerLanguage(event.target.value)}>
              <option value="all">Tất cả</option>
              {VOICE_LANGUAGES.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select></label>
            <label>Chất giọng<select value={pickerGender} onChange={event => setPickerGender(event.target.value)}>
              <option value="all">Tất cả</option><option value="masculine">Nam</option><option value="feminine">Nữ</option><option value="gender_neutral">Trung tính</option>
            </select></label>
          </div>
          <div className="voice-picker-sources">
            <button type="button" aria-pressed={!pickerMine} onClick={() => setPickerMine(false)}>Tất cả giọng</button>
            <button type="button" aria-pressed={pickerMine} onClick={() => setPickerMine(true)}><Mic2 size={15} aria-hidden="true" /> Giọng của tôi</button>
            <span role="status">{catalogLoading ? "Đang tải…" : `${pickerVoices.length} giọng`}</span>
          </div>
          {error && <p className="voice-picker-error" role="alert">{error}</p>}
        </div>
        <div className="voice-picker-results">
          {pickerVoices.map((voice, index) => (
            <article className="voice-picker-row" key={voice.id}>
              <span className={`voice-avatar voice-avatar-${index % 4}`} aria-hidden="true"><AudioLines size={21} /></span>
              <div className="voice-picker-info">
                <h3>{voice.name}</h3>
                <div className="voice-picker-meta">
                  {voice.kind === "clone" ? "Giọng của tôi" : VOICE_LANGUAGES.find(item => item.id === voice.language)?.name || voice.language}
                  <VoiceMetadata voice={voice} />
                </div>
                <p>{voice.description || "Giọng riêng của bạn"}</p>
              </div>
              <div className="voice-picker-row-actions">
                {voice.kind === "public" && <button type="button" className="voice-icon-btn" aria-label={`Nghe thử ${voice.name}`} aria-pressed={previewingId === voice.id} disabled={!!previewLoadingId} onClick={() => void previewVoice(voice)}>{previewLoadingId === voice.id ? <LoaderCircle size={18} className="voice-spin" /> : previewingId === voice.id ? <Pause size={18} /> : <Play size={18} />}</button>}
                <button type="button" className="voice-btn voice-picker-select" aria-label={`Chọn giọng ${voice.name}`} onClick={() => { choose(voice); voicePickerRef.current?.close(); }}>{selected.id === voice.id ? <><Check size={16} aria-hidden="true" /> Đang chọn</> : "Chọn"}</button>
              </div>
            </article>
          ))}
          {!pickerVoices.length && !catalogLoading && <div className="voice-picker-empty"><Search size={26} aria-hidden="true" /><h3>{pickerMine ? "Chưa có giọng của bạn phù hợp" : "Chưa tìm thấy giọng phù hợp"}</h3><p>Thử đổi bộ lọc hoặc tìm bằng tên khác.</p><button type="button" className="voice-btn" onClick={() => { setPickerSearch(""); setPickerLanguage("all"); setPickerGender("all"); setPickerMine(false); }}>Xem tất cả giọng</button></div>}
        </div>
      </dialog>
      <dialog
        ref={dialogRef}
        className="voice-checkout"
        onCancel={() => setCheckout(null)}
        onClose={() => setCheckout(null)}
        aria-labelledby="voice-checkout-title"
      >
        {checkout && (
          <>
            <div className="voice-titlebar">
              <span id="voice-checkout-title">
                Thanh toán gói{" "}
                {VOICE_PLANS.find((p) => p.id === checkout.order.plan_id)?.name}
              </span>
              <button
                className="voice-icon-btn"
                aria-label="Đóng thanh toán"
                onClick={() => setCheckout(null)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="voice-checkout-body">
              {error && (
                <p role="alert" className="voice-alert">
                  {error}
                </p>
              )}
              {checkout.order.status === "pending" && checkout.bank ? (
                <>
                  <span className="voice-step">
                    QUÉT MÃ VỚI ỨNG DỤNG NGÂN HÀNG
                  </span>
                  <strong className="voice-checkout-price">
                    {formatNumber(checkout.order.amount_vnd)}đ
                  </strong>
                  <div className="voice-payment-promise" role="status">
                    <strong>
                      Thanh toán <span className="voice-payment-emphasis">tự động 24/7</span>
                    </strong>
                    <span className="voice-payment-detail">
                      Quá trình mua tự động hoàn tất sau 5 giây khi thanh toán
                      thành công.
                    </span>
                  </div>
                  {checkout.order.demo_clone_id && (
                    <p>Thanh toán trước khi giọng nghe thử hết hạn để giữ lại giọng này. Nếu giọng đã bị xóa, gói vừa mua vẫn cho phép bạn tạo giọng mới.</p>
                  )}
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "13px",
                      fontWeight: 600,
                      padding: "4px 12px",
                      borderRadius: "9999px",
                      backgroundColor:
                        secondsRemaining < 60
                          ? "rgba(239,68,68,0.15)"
                          : "rgba(245,158,11,0.15)",
                      color: secondsRemaining < 60 ? "#ef4444" : "#f59e0b",
                      margin: "2px auto 6px",
                    }}
                  >
                    <Clock3 size={15} />
                    <span>
                      Tự động hủy sau:{" "}
                      {String(Math.floor(secondsRemaining / 60)).padStart(
                        2,
                        "0",
                      )}
                      :{String(secondsRemaining % 60).padStart(2, "0")}
                    </span>
                  </div>
                  <img
                    className="voice-qr"
                    src={`https://img.vietqr.io/image/${encodeURIComponent(checkout.bank.bank)}-${encodeURIComponent(checkout.bank.account)}-compact2.png?amount=${checkout.order.amount_vnd}&addInfo=${encodeURIComponent(checkout.order.payment_code)}&accountName=${encodeURIComponent(checkout.bank.name)}`}
                    alt="Mã QR chuyển khoản đúng số tiền và nội dung"
                  />
                  <p>
                    {checkout.bank.name}
                    <br />
                    {checkout.bank.bank} · {checkout.bank.account}
                  </p>
                  <button
                    className="voice-copy"
                    onClick={() => void copy(checkout.order.payment_code)}
                  >
                    {checkout.order.payment_code}
                    <Copy size={16} />
                  </button>
                  <p>
                    Giữ nguyên nội dung chuyển khoản. Hệ thống tự xác nhận khi
                    nhận được giao dịch.
                  </p>
                  <small>
                    Đơn tự động hủy sau 5 phút (hạn chót{" "}
                    {new Date(checkout.order.expires_at).toLocaleTimeString(
                      "vi-VN",
                    )}
                    ).
                  </small>
                </>
              ) : (
                <>
                  <CheckCircle2 size={42} />
                  <h2>{statusName(checkout.order.status)}</h2>
                  <p>
                    {checkout.order.status === "paid"
                      ? "Credit và lượt clone đã được cấp cho tài khoản."
                      : checkout.order.status === "review"
                        ? "Giao dịch cần được đối soát. Vui lòng liên hệ hỗ trợ kèm mã đơn."
                        : checkout.order.status === "expired"
                          ? "Đơn hàng đã hết hạn sau 5 phút. Vui lòng chọn gói lại để tạo đơn mới."
                          : "Đơn không thể thanh toán lúc này. Không chuyển tiền theo mã này."}
                  </p>
                  <code>{checkout.order.payment_code}</code>
                  {checkout.order.status === "expired" && (
                    <button
                      className="voice-btn voice-primary"
                      onClick={() => {
                        setCheckout(null);
                        setTab("plans");
                      }}
                    >
                      Chọn gói khác
                      <ArrowRight size={14} />
                    </button>
                  )}
                </>
              )}
              <button
                className="voice-btn"
                onClick={() => void openOrder(checkout.order.id)}
              >
                <RefreshCw size={16} />
                Kiểm tra trạng thái
              </button>
              <Link href="/support">Hỗ trợ thanh toán</Link>
              {checkout.order.status === "pending" && (
                <button
                  className="voice-text-button"
                  onClick={() => void cancelOrder()}
                >
                  Chưa chuyển tiền? Hủy đơn để chọn gói khác
                </button>
              )}
            </div>
          </>
        )}
      </dialog>
    </div>
  );
}
function Empty({
  icon: Icon,
  title,
  text,
  action,
  actionLabel,
}: {
  icon: typeof Mic2;
  title: string;
  text: string;
  action?: () => void;
  actionLabel?: string;
}) {
  return (
    <div className="voice-empty">
      <Icon size={35} />
      <h3>{title}</h3>
      <p>{text}</p>
      {action && (
        <button className="voice-btn" onClick={action}>
          {actionLabel}
          <ArrowRight size={15} />
        </button>
      )}
    </div>
  );
}
