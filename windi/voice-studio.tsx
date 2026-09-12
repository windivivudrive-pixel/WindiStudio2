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
  COMPARISON_VOICES,
  STARTER_VOICES,
  VOICE_LANGUAGES,
  VOICE_LIBRARY_LANGUAGES,
  VOICE_PLANS,
  type StudioVoice,
  type VoiceAccent,
  type VoiceAccount,
  type VoiceOrder,
} from "@/lib/voice/shared";
import { VoiceApiTokens } from "./voice-api-tokens";

type Tab = "create" | "voices" | "clone" | "history" | "plans";
const tabs = [
  { id: "create", label: "Tạo giọng nói", icon: AudioLines },
  { id: "voices", label: "Thư viện giọng", icon: Headphones },
  { id: "clone", label: "Clone giọng", icon: Mic2 },
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
          title="Clone Pro 2.1 ghi chú: quảng cáo"
          aria-label="Clone Pro 2.1 ghi chú: quảng cáo"
        >
          <Megaphone size={15} />
        </span>
      )}
      {voice.useCases?.includes("conversation") && (
        <span
          className="voice-metadata-conversation"
          title="Clone Pro 2.1 ghi chú: hội thoại"
          aria-label="Clone Pro 2.1 ghi chú: hội thoại"
        >
          <MessageCircleMore size={15} />
        </span>
      )}
      {voice.useCases?.includes("entertainment") && (
        <span
          className="voice-metadata-entertainment"
          title="Clone Pro 2.1 ghi chú: giải trí"
          aria-label="Clone Pro 2.1 ghi chú: giải trí"
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

type ComparisonItem = (typeof voiceComparisons)[number];
const comparisonWave = [
  9, 17, 12, 25, 31, 18, 36, 23, 15, 29, 20, 12, 26, 18, 8,
];

function VoiceComparisonShowcase({
  onClone,
  onTryVoice,
  selectedVoiceId,
}: {
  onClone: () => void;
  onTryVoice: (item: ComparisonItem) => void;
  selectedVoiceId?: string;
}) {
  const [playing, setPlaying] = useState("");
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
            Clone Pro 2.1 kết hợp chất giọng riêng với khả năng đọc ngữ cảnh để
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
      <div className="voice-compare-list">
        {voiceComparisons.map((sample, index) => {
          const isSelected = selectedVoiceId === sample.voiceId;
          return (
            <article className="voice-compare-row" key={sample.id}>
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
                  { kind: "pro", label: "Clone Pro 2.1", src: sample.pro },
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
                    {side.kind === "pro" && (
                      <div className="voice-compare-pro-footer">
                        <button
                          type="button"
                          className={`voice-compare-pro-action ${isSelected ? "is-selected" : ""}`}
                          onClick={() => onTryVoice(sample)}
                          aria-label={`Dùng thử giọng ${sample.voiceName}`}
                        >
                          {isSelected ? <Check size={13} /> : <Sparkles size={13} />}
                          <span>{isSelected ? "Đang chọn thử" : "Dùng thử"}</span>
                          <ArrowRight size={13} />
                        </button>
                      </div>
                    )}
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
          Tạo giọng Clone Pro <ArrowRight size={16} />
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
  const [createdVoiceId,setCreatedVoiceId]=useState<string|null>(null);
  const { user, isLoading } = useAuth();
  const [tab, setTab] = useState<Tab>("create");
  const [voices, setVoices] = useState<StudioVoice[]>([
    ...COMPARISON_VOICES,
    ...STARTER_VOICES,
  ]);
  const [selected, setSelected] = useState<StudioVoice>(
    COMPARISON_VOICES[0] || STARTER_VOICES[0],
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
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [gender, setGender] = useState("all");
  const [audio, setAudio] = useState<{ url: string; id: string } | null>(null);
  const [previewingId, setPreviewingId] = useState("");
  const [previewLoadingId, setPreviewLoadingId] = useState("");
  const [cloneName, setCloneName] = useState("");
  const [cloneLanguage, setCloneLanguage] = useState("vi");
  const [cloneAccent, setCloneAccent] = useState("");
  const [cloneAccents, setCloneAccents] = useState<VoiceAccent[]>([]);
  const [accentLoading, setAccentLoading] = useState(false);
  const [clip, setClip] = useState<File | null>(null);
  const [clipUrl, setClipUrl] = useState("");
  const [consent, setConsent] = useState(false);
  const [checkout, setCheckout] = useState<{
    order: VoiceOrder;
    bank: { bank: string; account: string; name: string } | null;
  } | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const previewAudioRef = useRef<HTMLAudioElement>(null);
  const previewUrls = useRef(new Map<string, string>());
  const activeUser = useRef(user?.id);
  activeUser.current = user?.id;
  const requestKey = useRef<{ payload: string; key: string } | null>(null);
  const cloneKey = useRef<string | null>(null);
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
    .filter((c) => c.status === "ready" && c.provider_id)
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
    ["ready", "reserved", "pending"].includes(c.status),
  ).length;
  const allVoices = [...cloneVoices, ...voices];
  const currentPlan = VOICE_PLANS.find((p) => p.id === period?.plan_id);
  const trialEligible = account?.trialEligible === true;
  const canPurchasePlan = (planId: string) =>
    planId === "trial"
      ? trialEligible && (!period || period.plan_id === "welcome")
      : !period ||
        period.plan_id === "welcome" ||
        (period.plan_id === "trial" && planId === "starter");
  const canGenerate =
    !!user &&
    available &&
    (isAdmin || !!period || workflowBonusRemaining > 0) &&
    credits > 0 &&
    credits <= 10000 &&
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
    setAudio(null);
    setAccount(null);
    setCheckout(null);
    setSelected(STARTER_VOICES[0]);
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
          setNotice("Thanh toán thành công. Gói của bạn đã sẵn sàng!");
          void refresh();
        }
      } catch {
        /* Keep the order visible; manual refresh is available. */
      }
    };
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void poll();
    }, 7000);
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
  function stopPreview() {
    previewAudioRef.current?.pause();
    setPreviewingId("");
  }
  function choose(v: StudioVoice) {
    stopPreview();
    setSelected(v);
    setTab("create");
    setNotice(`Đã chọn giọng ${v.name}.`);
  }
  function handleTryVoice(item: ComparisonItem) {
    stopPreview();
    setSelected({
      id: item.voiceId,
      name: item.voiceName,
      description: item.style,
      language: "vi",
      gender: item.gender,
      kind: "public",
    });
    setLanguage("vi");
    if (!text.trim()) {
      setText(item.sampleText);
    }
    setTab("create");
    setNotice(
      `Đã chọn giọng ${item.voiceName} để dùng thử. Nhập nội dung hoặc dùng câu thoại mẫu bên dưới.`,
    );
    requestAnimationFrame(() => {
      document
        .getElementById("voice-panel")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }
  async function previewVoice(voice: StudioVoice) {
    if (voice.kind !== "public" || previewLoadingId) return;
    if (previewingId === voice.id) {
      stopPreview();
      return;
    }
    stopPreview();
    setPreviewLoadingId(voice.id);
    setError("");
    try {
      let url = previewUrls.current.get(voice.id);
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
      const player = previewAudioRef.current;
      if (!player) throw new Error("Trình phát đang chưa sẵn sàng.");
      player.src = url;
      await player.play();
      setPreviewingId(voice.id);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Chưa tạo được bản nghe thử.",
      );
    } finally {
      setPreviewLoadingId("");
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
      setAudio(result);
      requestKey.current = null;
      setNotice("Âm thanh đã sẵn sàng. Bạn có thể nghe và tải MP3.");
    } catch (e) {
      setError((e as Error).message);
      if ((e as Error).message.includes("hoàn lại")) requestKey.current = null;
    } finally {
      setBusy("");
      await refresh();
    }
  }
  async function listen(id: string) {
    setBusy(id);
    setError("");
    try {
      const result = await api<{ url: string }>(`audio?id=${id}`);
      setAudio({ id, url: result.url });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  async function cloneVoice(event: React.FormEvent) {
    event.preventDefault();
    if (!clip || !consent || busy) return;
    setBusy("clone");
    setError("");
    cloneKey.current ||= crypto.randomUUID();
    const form = new FormData();
    form.set("clip", clip);
    form.set("name", cloneName);
    form.set("language", cloneLanguage);
    if (cloneAccent) form.set("accent", cloneAccent);
    form.set("consent", "true");
    form.set("requestKey", cloneKey.current);
    try {
      const result=await api<{voice_id?:string}>("clone", { method: "POST", body: form });
      setCreatedVoiceId(result.voice_id||null);
      setNotice("Đã tạo giọng riêng. Voice ID và nút sao chép nằm trên thẻ giọng bên dưới.");
      setClip(null);
      setCloneName("");
      setCloneAccent("");
      setConsent(false);
      cloneKey.current = null;
    } catch (e) {
      setError((e as Error).message);
      if ((e as Error).message.includes("hoàn lại")) cloneKey.current = null;
    } finally {
      setBusy("");
      await refresh();
    }
  }
  async function removeClone(id: string) {
    if (
      !window.confirm(
        "Xóa giọng này khỏi thư viện Clone Pro 2.1? Slot clone sẽ được giải phóng, nhưng credit đã dùng không được hoàn lại.",
      )
    )
      return;
    setBusy(id);
    setError("");
    try {
      await api(`clone?id=${id}`, { method: "DELETE" });
      setNotice("Đã xóa giọng và giải phóng slot clone.");
      if (account?.clones.find((c) => c.id === id)?.provider_id === selected.id)
        setSelected(STARTER_VOICES[0]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
      await refresh();
    }
  }
  async function purchase(planId: string) {
    setBusy(planId);
    setError("");
    try {
      const data = await api<NonNullable<typeof checkout>>(
        "orders",
        jsonPost({ planId }),
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

  return (
    <div className="voice-page">
      <div className="voice-heading">
        <div>
          <span className="voice-eyebrow">
            <span /> WINDI AUDIO LAB
          </span>
          <h1>
            Giọng clone như thật.
            <br />
            <span>Cảm xúc tự động theo ngữ cảnh.</span>
          </h1>
          <p>
            Không còn một giọng đọc đều đều cho mọi câu chữ. Clone Pro 2.1 giữ
            đúng chất giọng gốc, rồi tự thay đổi nhịp, ngữ điệu và sắc thái theo
            nội dung bạn viết.
          </p>
          <a className="voice-heading-link" href="#voice-comparison">
            Nghe 5 bản để thấy khác biệt <ArrowRight size={15} />
          </a>
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
            document
              .getElementById("voice-panel")
              ?.scrollIntoView({ behavior: "smooth", block: "start" }),
          );
        }}
        selectedVoiceId={selected.id}
        onTryVoice={handleTryVoice}
      />
      <section className="voice-workspace">
        <div className="voice-titlebar">
          <span>
            <AudioLines size={15} /> voice_studio.exe
          </span>
          <div>
            <span className="voice-model">CLONE PRO 2.1</span>
            <i />
            <i />
            <i />
          </div>
        </div>
        <div className="voice-tabs" role="tablist" aria-label="Voice Studio">
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              tabIndex={tab === t.id ? 0 : -1}
              onKeyDown={(event) => {
                const index = tabs.findIndex((item) => item.id === tab);
                const next =
                  event.key === "ArrowRight"
                    ? (index + 1) % tabs.length
                    : event.key === "ArrowLeft"
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
              <t.icon size={17} />
              <span>{t.label}</span>
              {t.id === "clone" && cloneVoices.length > 0 && (
                <small>{cloneVoices.length}</small>
              )}
            </button>
          ))}
        </div>
        <div className="voice-usage">
          <span>
            <span className="voice-status-dot" />
            {isLoading
              ? "Đang tải tài khoản…"
              : user
                ? isAdmin ? "Admin · Cartesia" : currentPlan
                  ? `Gói ${currentPlan.name}`
                  : workflowBonusRemaining > 0
                    ? "20K credit từ Video Workflow"
                    : "Chưa có gói dịch vụ"
                : "Không gian sáng tạo của bạn"}
          </span>
          <div>
            {user && (
              <>
                <strong>{isAdmin ? "Quota Cartesia" : formatNumber(remaining)}</strong>
                <span>{isAdmin ? "· quản trị" : "credit còn lại"}</span>
                {period && (
                  <span className="voice-period">
                    · đến {date(period.ends_at)}
                  </span>
                )}
              </>
            )}
            <button onClick={() => setTab("plans")}>
              {period || workflowBonusRemaining > 0
                ? "Xem gói"
                : "Khám phá các gói"}
              <ArrowRight size={14} />
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
        {!user && !isLoading && (
          <div className="voice-login-notice">
            <ShieldCheck size={17} />
            <span>
              Đăng nhập để quản lý credit, lưu audio và tạo giọng riêng.
            </span>
            <Link href="/login?next=/voice-studio">
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
        {notice && (
          <div className="voice-success" role="status">
            <CheckCircle2 size={17} />
            {notice}
          </div>
        )}
        {createdVoiceId && <div className="voice-success"><VoiceId id={createdVoiceId}/></div>}
        <div
          id="voice-panel"
          role="tabpanel"
          aria-labelledby={`voice-tab-${tab}`}
        >
          {tab === "create" && (
            <div className="voice-editor-layout">
              <div className="voice-editor">
                <div className="voice-section-heading">
                  <div>
                    <span className="voice-step">01 / NỘI DUNG</span>
                    <h2>Viết lời thoại. Để giọng nói tìm đúng nhịp.</h2>
                  </div>
                  <span className="voice-file-label">untitled.txt</span>
                </div>
                <div className="voice-samples">
                  <span>Thử một ý tưởng</span>
                  {samples.map((s) => (
                    <button
                      key={s.label}
                      onClick={() => {
                        setText(s.text);
                        requestKey.current = null;
                      }}
                    >
                      {s.label}
                      <Plus size={12} />
                    </button>
                  ))}
                </div>
                <label className="voice-sr-only" htmlFor="voice-text">
                  Nội dung cần đọc
                </label>
                <textarea
                  id="voice-text"
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                    requestKey.current = null;
                  }}
                  placeholder={
                    "Một câu chuyện hay bắt đầu từ một dòng chữ…\n\nNhập hoặc dán nội dung của bạn vào đây."
                  }
                  maxLength={20000}
                />
                <div className="voice-editor-footer">
                  <span className={credits > 10000 ? "voice-over-limit" : ""}>
                    {formatNumber(credits)} / 10.000 ký tự
                  </span>
                  <button
                    disabled={!text || !!busy}
                    onClick={() => {
                      setText("");
                      requestKey.current = null;
                    }}
                  >
                    Xóa nội dung
                  </button>
                </div>
                <div className="voice-create-footer">
                  <span>
                    <Sparkles size={16} /> 1 ký tự = 1 credit
                    <br />
                    <small>
                      Credit được hoàn khi yêu cầu thất bại đã xác nhận.
                    </small>
                  </span>
                  <button
                    className="voice-btn voice-primary"
                    disabled={!canGenerate}
                    onClick={() => void generate()}
                  >
                    {busy === "generate" ? (
                      <LoaderCircle size={18} className="voice-spin" />
                    ) : (
                      <Play size={17} />
                    )}{" "}
                    {busy === "generate" ? "Đang tạo…" : "Tạo giọng nói"}
                    <span>{formatNumber(credits)} cr</span>
                  </button>
                </div>
                {!isAdmin && credits > remaining && period && (
                  <p className="voice-inline-warning">
                    Nội dung vượt credit còn lại. Hãy rút ngắn nội dung.
                  </p>
                )}
              </div>
              <aside className="voice-settings">
                <span className="voice-step">02 / GIỌNG ĐỌC</span>
                <h2>Chọn chất giọng. Lời thoại dẫn cảm xúc.</h2>
                <button
                  className="voice-selected"
                  onClick={() => setTab("voices")}
                >
                  <span className="voice-avatar">
                    <AudioLines size={24} />
                  </span>
                  <span>
                    <strong>{selected.name}</strong>
                    <small>
                      {selected.kind === "clone"
                        ? "Giọng riêng"
                        : "Thư viện Clone Pro 2.1"}
                    </small>
                  </span>
                  <ArrowRight size={17} />
                </button>
                <button
                  className="voice-text-button"
                  onClick={() => setTab("voices")}
                >
                  Đổi giọng đọc <Headphones size={14} />
                </button>
                <VoiceId id={selected.id}/>
                <Link href={`/account?voice=${encodeURIComponent(selected.id)}#api`}>API key và cách dùng trong code →</Link>
                <label htmlFor="voice-language">Ngôn ngữ đầu ra</label>
                <select
                  id="voice-language"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                >
                  {VOICE_LANGUAGES.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
                <p className="voice-hint">
                  Giọng đa ngôn ngữ. Chọn ngôn ngữ khớp với nội dung.
                </p>
                <label htmlFor="voice-speed" className="voice-speed-label">
                  Tốc độ <strong>{speed.toFixed(2)}×</strong>
                </label>
                <input
                  id="voice-speed"
                  type="range"
                  min="0.6"
                  max="1.5"
                  step="0.05"
                  value={speed}
                  onChange={(e) => setSpeed(Number(e.target.value))}
                />
                <div className="voice-range-label">
                  <span>Chậm</span>
                  <span>Nhanh</span>
                </div>
                <div className="voice-format">
                  <Music2 size={18} />
                  <div>
                    <strong>MP3 · 44,1 kHz</strong>
                    <small>Sẵn sàng cho video & podcast</small>
                  </div>
                </div>
                <div className="voice-tip">
                  <Mic2 size={19} />
                  <strong>Muốn dùng giọng của bạn?</strong>
                  <p>
                    Thêm một mẫu ghi âm và tạo giọng riêng cho những câu chuyện
                    tiếp theo.
                  </p>
                  <button onClick={() => setTab("clone")}>
                    Tạo giọng clone <ArrowRight size={14} />
                  </button>
                </div>
              </aside>
            </div>
          )}
          {tab === "voices" && (
            <section className="voice-tab-body">
              <div className="voice-section-heading">
                <div>
                  <span className="voice-step">VOICE LIBRARY</span>
                  <h2>Tìm tiếng nói cho câu chuyện.</h2>
                  <p>
                    8 ngôn ngữ mẫu được tuyển chọn. Icon chỉ hiện khi Clone Pro
                    2.1 có ghi chú giới tính hoặc mục đích sử dụng rõ ràng.
                  </p>
                </div>
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
              <div className="voice-library-count">
                {catalogLoading
                  ? "Đang tải thư viện…"
                  : `${filtered.length} giọng có sẵn`}
              </div>
              <audio
                className="voice-sr-only"
                ref={previewAudioRef}
                onEnded={() => setPreviewingId("")}
                onPause={() => setPreviewingId("")}
              />
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
                    <VoiceId id={v.id}/>
                    <p>
                      {v.description || "Giọng đọc từ thư viện Clone Pro 2.1."}
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
                  title="Chưa tìm thấy giọng phù hợp"
                  text="Thử đổi bộ lọc hoặc tìm bằng một tên khác."
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
                  {isAdmin ? `${activeCloneCount} giọng · quota Cartesia` : period
                    ? period.clone_limit
                      ? `${activeCloneCount} / ${period.clone_limit} giọng đang hoạt động`
                      : "Chọn Clone thử để tạo giọng riêng"
                    : "1 / 5 / 20 slot theo gói"}
                </span>
              </div>
              {user &&
              account &&
              !isAdmin &&
              (!period || period.plan_id === "welcome") &&
              trialEligible ? (
                <div className="voice-clone-unlock">
                  <div>
                    <strong>Chưa có gói clone</strong>
                    <p>
                      Mở 1 slot clone và 10.000 credit trong 14 ngày với gói
                      dùng thử một lần.
                    </p>
                  </div>
                  <button
                    className="voice-btn voice-primary"
                    disabled={!!busy || !payments || !available}
                    onClick={() => void purchase("trial")}
                  >
                    Mua Clone thử · 29.000đ <ArrowRight size={15} />
                  </button>
                </div>
              ) : user &&
                account &&
                (!period || period.plan_id === "welcome") &&
                !trialEligible ? (
                <div className="voice-clone-unlock">
                  <div>
                    <strong>Gói Clone thử không còn khả dụng</strong>
                    <p>
                      Bạn đã từng thanh toán gói clone. Chọn một gói chính để
                      tiếp tục tạo giọng riêng.
                    </p>
                  </div>
                  <button className="voice-btn" onClick={() => setTab("plans")}>
                    Xem gói dịch vụ <ArrowRight size={15} />
                  </button>
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
                      Accent / vùng giọng
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
                            ? "Đang tải accent…"
                            : cloneAccents.length
                              ? "Tự nhận theo mẫu ghi âm"
                              : "Chưa có accent để chọn"}
                        </option>
                        {cloneAccents.map((accent) => (
                          <option key={accent.id} value={accent.id}>
                            {accent.name} · {accent.locale}
                          </option>
                        ))}
                      </select>
                      <span className="voice-field-hint">
                        Accent chỉ là nhãn phân loại; chất giọng thực tế vẫn dựa
                        trên mẫu ghi âm.
                      </span>
                    </label>
                    <label className="voice-upload">
                      <Upload size={30} />
                      <strong>
                        {clip ? clip.name : "Chọn file ghi âm của bạn"}
                      </strong>
                      <span>MP3, WAV, FLAC, OGG, WebM · tối đa 3 MB</span>
                      <input
                        type="file"
                        accept=".mp3,.wav,.flac,.ogg,.webm"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file && file.size > 3 * 1024 * 1024) {
                            setError("Chọn file nhỏ hơn 3 MB.");
                            e.target.value = "";
                            return;
                          }
                          setClip(file || null);
                          cloneKey.current = null;
                          setError("");
                        }}
                      />
                    </label>
                    {clipUrl && (
                      <audio
                        aria-label="Nghe mẫu giọng của bạn"
                        src={clipUrl}
                        controls
                        preload="metadata"
                      />
                    )}
                    <label className="voice-consent">
                      <input
                        type="checkbox"
                        required
                        checked={consent}
                        onChange={(e) => setConsent(e.target.checked)}
                      />
                      <span>
                        Tôi là chủ giọng nói hoặc đã được chủ giọng cho phép tạo
                        và sử dụng giọng AI. Tôi đồng ý gửi mẫu để Clone Pro 2.1
                        xử lý.
                      </span>
                    </label>
                    <button
                      className="voice-btn voice-primary"
                      disabled={
                        !user ||
                        !available ||
                        (!isAdmin && !period) ||
                        !clip ||
                        !consent ||
                        !cloneName.trim() ||
                        !!busy ||
                        (!isAdmin && (!period?.clone_limit || activeCloneCount >= period.clone_limit))
                      }
                    >
                      {busy === "clone" ? (
                        <LoaderCircle size={17} className="voice-spin" />
                      ) : (
                        <Mic2 size={17} />
                      )}{" "}
                      {busy === "clone"
                        ? "Đang clone giọng…"
                        : (isAdmin || period?.clone_limit)
                          ? "Tạo giọng riêng"
                          : "Chọn Clone thử để tạo giọng riêng"}
                    </button>
                  </form>
                  <aside className="voice-clone-guide">
                    <span className="voice-guide-icon">
                      <Mic2 size={36} />
                    </span>
                    <h3>Mẫu tốt, giọng tự nhiên hơn.</h3>
                    <ol>
                      <li>
                        <strong>Thu khoảng 10–20 giây</strong>
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
                  </aside>
                </div>
              )}
              <div className="voice-section-heading voice-my-clones">
                <div>
                  <h2>
                    Giọng của tôi <small>({cloneVoices.length})</small>
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
              {!account?.clones.length ? (
                <Empty
                  icon={Mic2}
                  title="Một giọng nói đang chờ được tạo"
                  text="Giọng clone của bạn sẽ xuất hiện ở đây."
                />
              ) : (
                <div className="voice-grid">
                  {account.clones.map((c) => (
                    <article className="voice-card" key={c.id}>
                      <span className="voice-avatar">
                        <Mic2 size={23} />
                      </span>
                      <h3>{c.name}</h3>
                      {c.status==='ready' && <VoiceId id={c.provider_id}/>}
                      <p>
                        {c.language.toUpperCase()}
                        {c.accent ? ` · ${c.accent}` : ""} ·{" "}
                        {c.status === "failed"
                          ? "Thất bại · đã hoàn lượt"
                          : statusName(c.status)}
                      </p>
                      {c.status === "ready" && (
                        <div className="voice-card-actions">
                          <button
                            className="voice-btn"
                            onClick={() =>
                              choose(
                                cloneVoices.find(
                                  (v) => v.id === c.provider_id,
                                )!,
                              )
                            }
                          >
                            Sử dụng
                            <ArrowRight size={14} />
                          </button>
                          <button
                            className="voice-icon-btn"
                            aria-label={`Xóa giọng ${c.name}`}
                            disabled={!!busy}
                            onClick={() => void removeClone(c.id)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
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
                  <p>50 bản ghi gần nhất. Nghe lại và tải về khi bạn cần.</p>
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
                    <article key={j.id}>
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
                          className="voice-btn"
                          disabled={!!busy}
                          onClick={() => void listen(j.id)}
                        >
                          <Play size={15} />
                          Nghe / tải
                        </button>
                      )}
                    </article>
                  ))}
                </div>
              )}
              <p className="voice-hint">
                Yêu cầu chờ đối soát vẫn tạm giữ credit.{" "}
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
                <p>
                  Clone thử mua một lần. Các gói còn lại theo tháng và không tự
                  động gia hạn.
                </p>
              </div>
              <div className="voice-plans">
                {VOICE_PLANS.filter(
                  (p) =>
                    p.id !== "trial" ||
                    !user ||
                    account === null ||
                    trialEligible,
                ).map((p, i) => {
                  const featured = p.id === "starter";
                  const isCurrent = currentPlan?.id === p.id;
                  const canBuy = p.purchasable && canPurchasePlan(p.id);
                  const upgradeFromTrial =
                    period?.plan_id === "trial" && p.id === "starter";
                  return (
                    <article
                      className={`voice-plan ${featured ? "voice-plan-featured" : ""}`}
                      key={p.id}
                    >
                      {featured && (
                        <span className="voice-popular">DÀNH CHO CREATOR</span>
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
                          {p.id === "trial"
                            ? "Nâng cấp Starter trong hạn dùng: còn 40.000đ"
                            : p.clone_limit
                              ? "Xóa giọng để giải phóng slot"
                              : "Không cần thanh toán để bắt đầu"}
                        </li>
                        <li>
                          <Check size={15} />
                          Clone Pro 2.1 · xuất file MP3
                        </li>
                        <li>
                          <Check size={15} />
                          Lưu lịch sử và tải âm thanh
                        </li>
                      </ul>
                      {!user ? (
                        <Link
                          href="/login?next=/voice-studio"
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
                            "Gói hiện tại"
                          ) : !p.purchasable ? (
                            "Tự cấp khi đăng ký"
                          ) : upgradeFromTrial ? (
                            "Nâng cấp Starter · còn 40.000đ"
                          ) : !canBuy ? (
                            "Mua khi hết chu kỳ"
                          ) : !payments || !available ? (
                            "Sắp mở thanh toán"
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
              <div className="voice-plan-notes">
                <p>
                  <strong>Credit tính thế nào?</strong> 1 ký tự = 1 credit, gồm
                  dấu câu và khoảng trắng trong nội dung. Credit có hiệu lực
                  theo từng gói và không cộng dồn sang kỳ sau.
                </p>
                <p>
                  <strong>Giọng clone qua tháng mới?</strong> Giọng được giữ
                  lại. Starter có một slot clone đang hoạt động: bạn giữ giọng
                  đã tạo ở gói thử, không nhận thêm một giọng clone mới. Gói hết
                  hạn vẫn có thể tải các audio đã tạo.
                </p>
              </div>
              <Link className="voice-btn" href="/account">Hồ sơ, đơn hàng và API key →</Link>
              <VoiceApiTokens enabled={!!user} />
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
        {audio && (
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
              src={audio.url}
              controls
              preload="metadata"
              aria-label="Bản ghi đã tạo"
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
              onClick={() => setAudio(null)}
            >
              <X size={17} />
            </button>
          </div>
        )}
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
