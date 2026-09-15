import { useState, useEffect, useRef, useMemo } from "react";
import { MapPin, Search, MessageCircle, X, Send, ArrowLeft, Megaphone, Check, Sparkles, User, LogOut, Pin, BadgeCheck, Crown, ExternalLink, TrendingUp, PartyPopper, Flag, Bell, Plus, SlidersHorizontal, Globe, ScanLine, Flame } from "lucide-react";
import { supabase } from "./supabaseClient";

// ---------- design tokens (liquid glass) ----------
const C = {
  ink: "#1C1C1E",
  inkSoft: "#6E6E73",
  inkFaint: "#9A9AA1",
  hairline: "rgba(60,60,67,0.14)",
  glass: "rgba(255,255,255,0.55)",
  glassStrong: "rgba(255,255,255,0.72)",
  glassDark: "rgba(28,28,30,0.55)",
  blue: "#0A84FF",
  red: "#FF3B30",
  gold: "#C98A0B",
  green: "#30B356",
  purple: "#AF52DE",
};

const FONT =
  "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif";
const MONO = "ui-monospace, 'SF Mono', 'IBM Plex Mono', Menlo, monospace";

// reusable frosted glass surface
function Glass({ children, style, strong, dark, radius = 20, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: dark ? C.glassDark : strong ? C.glassStrong : C.glass,
        backdropFilter: "blur(24px) saturate(180%)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
        border: `1px solid ${dark ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.6)"}`,
        borderRadius: radius,
        boxShadow: "0 8px 30px rgba(31,38,45,0.10), inset 0 1px 0 rgba(255,255,255,0.5)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// typeahead that suggests real card names as you type — tries a live lookup
// against the TCGdex API for Pokémon, merges in the local dataset, and falls
// back to local-only silently if the network call fails or for One Piece
// (see dataset comment above for why that side is local-only for now)
function CardTypeahead({ value, onChange, game, placeholder, style }) {
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!value || value.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const q = value.trim().toLowerCase();
      const localDataset = game === "onepiece" ? ONE_PIECE_CARD_DATASET : POKEMON_CARD_DATASET;
      let results = localDataset.filter((n) => n.toLowerCase().includes(q));

      if (game !== "onepiece") {
        try {
          const res = await fetch(`https://api.tcgdex.net/v2/en/cards?name=like:${encodeURIComponent(q)}`);
          if (res.ok) {
            const data = await res.json();
            const liveNames = Array.isArray(data) ? data.map((c) => c.name).filter(Boolean) : [];
            results = [...new Set([...liveNames, ...results])];
          }
        } catch {
          // offline or blocked — local dataset above already covers this
        }
      }
      setSuggestions(results.slice(0, 6));
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [value, game]);

  return (
    <div style={{ position: "relative" }}>
      <input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        style={style}
      />
      {open && suggestions.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            marginTop: 4,
            background: "rgba(255,255,255,0.92)",
            backdropFilter: "blur(20px)",
            border: `1px solid ${C.hairline}`,
            borderRadius: 12,
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            zIndex: 20,
            overflow: "hidden",
          }}
        >
          {suggestions.map((s) => (
            <button
              key={s}
              className="mp-press"
              onClick={() => {
                onChange(s);
                setOpen(false);
              }}
              style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", padding: "10px 14px", fontSize: 13.5, color: C.ink, borderBottom: `1px solid ${C.hairline}` }}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function WantCard({ w, auth, onReport, onChat, showName }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <Glass radius={20} style={{ padding: "16px 18px", border: w.boosted ? `1.5px solid ${C.gold}` : undefined, boxShadow: w.boosted ? "0 8px 26px rgba(201,138,11,0.22)" : undefined }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          {w.boosted ? (
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 8, color: C.gold, fontSize: 10.5, fontWeight: 700 }}>
              <Pin size={11} /> BOOSTED
            </div>
          ) : (
            <div />
          )}
          {w.userId !== auth?.id && (
            <button
              className="mp-press"
              onClick={() => onReport(w.id)}
              title="Report this shoutout"
              style={{ background: "none", border: "none", padding: 2, marginTop: -4, marginRight: -4, color: C.inkFaint }}
              aria-label="Report"
            >
              <Flag size={13} />
            </button>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
          <Megaphone size={12} color={C.red} />
          <div style={{ fontSize: 11, color: C.red, fontWeight: 700, letterSpacing: "0.03em" }}>LOOKING FOR</div>
          {w.game && (
            <span style={{ fontSize: 10, color: C.inkFaint, fontWeight: 650 }}>· {w.game === "onepiece" ? "One Piece" : "Pokémon"}</span>
          )}
        </div>
        <div style={{ fontSize: 16.5, fontWeight: 650, lineHeight: 1.3, letterSpacing: "-0.01em" }}>{w.card}</div>
        {w.detail && <div style={{ fontSize: 13.5, color: C.inkSoft, marginTop: 5, lineHeight: 1.4 }}>{w.detail}</div>}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{w.userId === auth?.id ? "You" : w.posterName || "A collector"}</span>
              {(w.userId === auth?.id ? auth?.dealer : w.posterDealer) && <BadgeCheck size={13} color={C.blue} />}
            </div>
            <div style={{ fontFamily: MONO, fontSize: 10.5, color: C.inkFaint }}>
              {showName && <>{showName} · </>}
              {timeAgo(w.ts)}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {w.maxPrice && (
              <div style={{ fontFamily: MONO, fontSize: 12.5, color: C.gold, fontWeight: 700, background: "rgba(201,138,11,0.12)", padding: "4px 9px", borderRadius: 8 }}>
                up to {w.maxPrice}
              </div>
            )}
            {w.userId !== auth?.id && (
              <button
                className="mp-press"
                onClick={() => onChat(w.userId)}
                style={{
                  background: C.blue,
                  color: "white",
                  border: "none",
                  borderRadius: 999,
                  padding: "8px 14px",
                  fontSize: 12.5,
                  fontWeight: 650,
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  boxShadow: "0 3px 10px rgba(10,132,255,0.35)",
                }}
              >
                <MessageCircle size={13} /> I've got one
              </button>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 14, marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.hairline}` }}>
          <a href="https://www.tcgplayer.com" target="_blank" rel="noreferrer" style={{ fontSize: 11.5, color: C.inkSoft, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 3, textDecoration: "none" }}>
            Check price <ExternalLink size={10} />
          </a>
          <a href="https://www.psacard.com" target="_blank" rel="noreferrer" style={{ fontSize: 11.5, color: C.inkSoft, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 3, textDecoration: "none" }}>
            Get graded <ExternalLink size={10} />
          </a>
        </div>
      </Glass>
    </div>
  );
}

// ---------- date helpers for real "happening today" logic ----------
function atTime(daysFromNow, hour, minute) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, minute, 0, 0);
  return d;
}
function daysUntilWeekday(targetDow) {
  const today = new Date().getDay();
  return (targetDow - today + 7) % 7;
}
function isSameDay(a, b) {
  return a.toDateString() === b.toDateString();
}
function formatShowWindow(start, end) {
  const now = new Date();
  const dayLabel = isSameDay(start, now)
    ? "Today"
    : isSameDay(start, atTime(1, 0, 0))
    ? "Tomorrow"
    : start.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const fmt = (d) => d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${dayLabel}, ${fmt(start)} – ${fmt(end)}`;
}

// ---------- mock data ----------
// in production these come from a live events feed (organizer submissions or a
// TCG event API) rather than being hardcoded — this just simulates "today" logic
// against real Date objects so the grouping/badges below are actually live.
const SHOWS = [
  { id: "s1", name: "One Piece Card Game SG Regional Qualifier", venue: "Suntec Singapore Convention Centre", lat: 1.2966, lng: 103.8577, start: atTime(0, 9, 0), end: atTime(0, 17, 0) },
  { id: "s2", name: "Pokémon TCG Community League Night", venue: "Games Mansion, Peninsula Shopping Centre", lat: 1.2936, lng: 103.8500, start: atTime(0, 10, 0), end: atTime(0, 16, 0) },
  { id: "s3", name: "Bishan Card Traders Meetup", venue: "Bishan Community Club, Hall 2", lat: 1.3506, lng: 103.8496, start: atTime(1, 9, 0), end: atTime(1, 18, 0) },
  { id: "s4", name: "Toa Payoh Bounty Hunters One Piece Meet", venue: "Toa Payoh HDB Hub, Atrium", lat: 1.3326, lng: 103.8489, start: atTime(daysUntilWeekday(6) || 7, 11, 0), end: atTime(daysUntilWeekday(6) || 7, 19, 0) },
];

// free accounts can shout unlimited cards, just no more than once per hour —
// Premium removes the wait entirely
const FREE_SHOUT_COOLDOWN_MS = 60 * 60 * 1000;
function formatCooldown(ms) {
  const totalMin = Math.ceil(ms / 60000);
  if (totalMin >= 60) return "1h";
  if (totalMin >= 1) return `${totalMin}m`;
  return "under a minute";
}

// basic on-topic / spam guard — real moderation happens server-side (see notes),
// this just catches obvious junk before it's even submitted
const BLOCKED_TERMS = ["http://", "https://", "www.", "nsfw", "xxx", "porn", "crypto", "follow me", "onlyfans", "free money"];
function violatesContentPolicy(text) {
  const lower = text.toLowerCase();
  return BLOCKED_TERMS.some((term) => lower.includes(term));
}

const PEOPLE = [
  { id: "u_marcus", name: "Marcus T.", dealer: true },
  { id: "u_dana", name: "Dana R." },
  { id: "u_priya", name: "Priya K." },
  { id: "u_lou", name: "Old Man Lou" },
  { id: "u_jess", name: "Jess W." },
];

// local fallback/reference datasets used for search suggestions.
// Pokémon suggestions also try a live lookup against the free TCGdex API
// (api.tcgdex.net — no key required) and merge the results in; if that
// request fails (offline, CORS, etc.) it silently falls back to this list.
// There's no equally reliable free public REST API for One Piece TCG yet,
// so those suggestions are local-only for now — swap in a real one piece
// TCG API here once one's available.
const POKEMON_CARD_DATASET = [
  "Charizard", "Charizard VMAX", "Charizard ex", "Blastoise", "Venusaur",
  "Pikachu", "Pikachu Illustrator", "Umbreon VMAX", "Umbreon ex", "Mewtwo",
  "Mew", "Rayquaza VMAX", "Lugia", "Gengar", "Gyarados", "Eevee", "Snorlax",
  "Dragonite", "Gardevoir ex", "Lucario", "Greninja", "Sylveon VMAX",
];
const ONE_PIECE_CARD_DATASET = [
  "Luffy Gear 5", "Monkey D. Luffy", "Roronoa Zoro", "Shanks", "Trafalgar Law",
  "Nami", "Sanji", "Nico Robin", "Portgas D. Ace", "Kaido", "Whitebeard",
  "Boa Hancock", "Yamato", "Eustass Kid", "Dracule Mihawk", "Charlotte Katakuri",
];

const SEED_THREADS = {
  u_marcus: [
    { from: "u_marcus", text: "Hey — I've got a raw Charizard Base Set, edge wear on the back but front's clean. Interested?", ts: Date.now() - 1000 * 60 * 20 },
    { from: "me", text: "Depends on the wear — can you send a photo of the back corners?", ts: Date.now() - 1000 * 60 * 18 },
  ],
};

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function timeAgo(ts) {
  const mins = Math.max(1, Math.round((Date.now() - ts) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  return `${hrs}h ago`;
}

function personName(id) {
  if (id === "me") return "You";
  const p = PEOPLE.find((p) => p.id === id);
  return p ? p.name : id;
}

function isDealer(id, auth) {
  if (id === "me") return auth?.dealer;
  const p = PEOPLE.find((p) => p.id === id);
  return !!(p && p.dealer);
}

export default function MegaphoneApp() {
  const [screen, setScreen] = useState("shows");
  const [activeShowId, setActiveShowId] = useState(null);
  const [coords, setCoords] = useState(null);
  const [geoState, setGeoState] = useState("idle");
  const [wants, setWants] = useState([]);
  const profileCacheRef = useRef({});
  const [threads, setThreads] = useState(SEED_THREADS);
  const [showPostForm, setShowPostForm] = useState(false);
  const [activeThread, setActiveThread] = useState(null);
  const [query, setQuery] = useState("");
  const [chatOrigin, setChatOrigin] = useState("feed"); // "feed" | "account" | "shows"
  const [auth, setAuth] = useState({ loggedIn: false, id: null, name: "", email: "", premium: false, dealer: false });
  const [showPaywall, setShowPaywall] = useState(false);
  const [planPerks, setPlanPerks] = useState(null); // "premium" | "dealer" | null
  const [keywordAlerts, setKeywordAlerts] = useState([]);
  const [readAlertIds, setReadAlertIds] = useState([]);
  const [alertsOrigin, setAlertsOrigin] = useState("shows");
  const [gameFilter, setGameFilter] = useState("all"); // "all" | "pokemon" | "onepiece"
  const [boostedOnly, setBoostedOnly] = useState(false);
  const [dealersOnly, setDealersOnly] = useState(false);
  const [searchAllShows, setSearchAllShows] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [scanningCard, setScanningCard] = useState(false);
  const scanInputRef = useRef(null);
  const [watchlist, setWatchlist] = useState([]);
  const [now, setNow] = useState(() => Date.now());

  // ticks so the "next free shoutout" cooldown countdown stays live
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoState("denied");
      return;
    }
    setGeoState("asking");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoState("ok");
      },
      () => setGeoState("denied"),
      { timeout: 4000 }
    );
  }, []);

  // real Supabase auth — a magic-link session drives `auth`, backed by a row
  // in `profiles` (created on first sign-in) for name/premium/dealer
  useEffect(() => {
    let active = true;

    async function syncProfile(session) {
      if (!session) {
        if (active) setAuth({ loggedIn: false, id: null, name: "", email: "", premium: false, dealer: false });
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("name, premium, dealer")
        .eq("id", session.user.id)
        .maybeSingle();

      let profileRow = profile;
      if (!profileRow) {
        const name = session.user.user_metadata?.name || session.user.email.split("@")[0];
        const { data: inserted } = await supabase
          .from("profiles")
          .insert({ id: session.user.id, name })
          .select("name, premium, dealer")
          .single();
        profileRow = inserted || { name, premium: false, dealer: false };
      }

      if (!active) return;
      setAuth({
        loggedIn: true,
        id: session.user.id,
        name: profileRow.name,
        email: session.user.email,
        premium: !!profileRow.premium,
        dealer: !!profileRow.dealer,
      });
    }

    supabase.auth.getSession().then(({ data: { session } }) => syncProfile(session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => syncProfile(session));

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function sendMagicLink(name, email) {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin, data: { name } },
    });
    if (error) throw error;
  }

  // premium/dealer are demo self-serve toggles here, but in production these
  // would be flipped by a payment-webhook using a service role key rather
  // than the signed-in user updating their own row
  async function setProfileFlag(flag, value) {
    setAuth((prev) => ({ ...prev, [flag]: value }));
    await supabase.from("profiles").update({ [flag]: value }).eq("id", auth.id);
  }

  // maps a `wants` row (plus an optional embedded `profiles` join) onto the
  // shape the rest of the UI expects, caching poster name/dealer by user id
  // so realtime events — which only carry the changed row, not the join —
  // can still resolve a display name for a poster we've already seen
  function decorateWant(row) {
    if (row.profiles) profileCacheRef.current[row.user_id] = row.profiles;
    const poster = profileCacheRef.current[row.user_id];
    return {
      id: row.id,
      userId: row.user_id,
      showId: row.show_id,
      game: row.game,
      card: row.card,
      detail: row.detail,
      maxPrice: row.max_price,
      boosted: row.boosted,
      found: row.found,
      hidden: row.hidden,
      reports: row.reports,
      ts: new Date(row.created_at).getTime(),
      posterName: poster?.name,
      posterDealer: !!poster?.dealer,
    };
  }

  // wants board — loaded once, then kept live via a postgres_changes
  // subscription so every device sees new/updated/removed shoutouts instantly
  useEffect(() => {
    let active = true;

    async function loadWants() {
      const { data, error } = await supabase
        .from("wants")
        .select("*, profiles(name, dealer)")
        .order("created_at", { ascending: false });
      if (!active) return;
      if (error) {
        console.error("Failed to load wants", error);
        return;
      }
      setWants(data.map(decorateWant));
    }
    loadWants();

    const channel = supabase
      .channel("wants-feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "wants" }, async (payload) => {
        const row = payload.new;
        if (!profileCacheRef.current[row.user_id]) {
          const { data: profile } = await supabase.from("profiles").select("name, dealer").eq("id", row.user_id).maybeSingle();
          if (profile) profileCacheRef.current[row.user_id] = profile;
        }
        if (!active) return;
        setWants((prev) => (prev.some((w) => w.id === row.id) ? prev : [decorateWant(row), ...prev]));
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "wants" }, (payload) => {
        const row = payload.new;
        setWants((prev) => prev.map((w) => (w.id === row.id ? decorateWant(row) : w)));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "wants" }, (payload) => {
        setWants((prev) => prev.filter((w) => w.id !== payload.old.id));
      })
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  // keyword alerts — scoped to the signed-in user, loaded fresh on login and
  // kept live so an alert added on another device shows up here too
  useEffect(() => {
    if (!auth.id) {
      setKeywordAlerts([]);
      return;
    }
    let active = true;

    async function loadKeywordAlerts() {
      const { data, error } = await supabase.from("keyword_alerts").select("keyword").eq("user_id", auth.id);
      if (!active) return;
      if (error) {
        console.error("Failed to load keyword alerts", error);
        return;
      }
      setKeywordAlerts(data.map((row) => row.keyword));
    }
    loadKeywordAlerts();

    const channel = supabase
      .channel(`keyword-alerts-${auth.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "keyword_alerts", filter: `user_id=eq.${auth.id}` },
        (payload) => {
          setKeywordAlerts((prev) => (prev.includes(payload.new.keyword) ? prev : [...prev, payload.new.keyword]));
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "keyword_alerts", filter: `user_id=eq.${auth.id}` },
        (payload) => {
          setKeywordAlerts((prev) => prev.filter((k) => k !== payload.old.keyword));
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [auth.id]);

  // want list — a personal, per-user list of cards to look for, prepped ahead
  // of a show so they can be quick-selected onto the board instead of retyped
  useEffect(() => {
    if (!auth.id) {
      setWatchlist([]);
      return;
    }
    let active = true;

    function decorateWatchlistRow(row) {
      return { id: row.id, game: row.game, card: row.card, detail: row.detail, maxPrice: row.max_price };
    }

    async function loadWatchlist() {
      const { data, error } = await supabase
        .from("want_list")
        .select("*")
        .eq("user_id", auth.id)
        .order("created_at", { ascending: false });
      if (!active) return;
      if (error) {
        console.error("Failed to load want list", error);
        return;
      }
      setWatchlist(data.map(decorateWatchlistRow));
    }
    loadWatchlist();

    const channel = supabase
      .channel(`want-list-${auth.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "want_list", filter: `user_id=eq.${auth.id}` },
        (payload) => {
          const row = payload.new;
          setWatchlist((prev) => (prev.some((w) => w.id === row.id) ? prev : [decorateWatchlistRow(row), ...prev]));
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "want_list", filter: `user_id=eq.${auth.id}` },
        (payload) => {
          setWatchlist((prev) => prev.filter((w) => w.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [auth.id]);

  async function addToWatchlist(entry) {
    if (!auth.id || !entry.card?.trim()) return;
    const { error } = await supabase.from("want_list").insert({
      user_id: auth.id,
      game: entry.game,
      card: entry.card.trim(),
      detail: entry.detail?.trim() || null,
      max_price: entry.maxPrice?.trim() || null,
    });
    if (error) console.error("Failed to add to want list", error);
  }
  async function removeFromWatchlist(id) {
    if (!auth.id) return;
    const { error } = await supabase.from("want_list").delete().eq("id", id).eq("user_id", auth.id);
    if (error) console.error("Failed to remove from want list", error);
  }

  const showsWithDistance = useMemo(() => {
    const now = new Date();
    return SHOWS.filter((s) => s.end >= now)
      .map((s) => ({
        ...s,
        distance: coords ? haversine(coords.lat, coords.lng, s.lat, s.lng) : null,
        isToday: isSameDay(s.start, now),
        whenLabel: formatShowWindow(s.start, s.end),
      }))
      .sort((a, b) => {
        if (a.isToday !== b.isToday) return a.isToday ? -1 : 1;
        if (a.distance == null || b.distance == null) return a.start - b.start;
        return a.distance - b.distance;
      });
  }, [coords]);
  const todayShows = showsWithDistance.filter((s) => s.isToday);
  const upcomingShows = showsWithDistance.filter((s) => !s.isToday);

  // trending — most-shouted cards across today's shows (falls back to all
  // shows if nothing's happening today yet), each linked to whichever show
  // currently has the most demand for it
  const trending = useMemo(() => {
    const todayIds = new Set(todayShows.map((s) => s.id));
    const pool = wants.filter((w) => !w.hidden && (todayIds.size === 0 || todayIds.has(w.showId)));
    const counts = {};
    pool.forEach((w) => {
      if (!counts[w.card]) counts[w.card] = { card: w.card, count: 0, byShow: {} };
      counts[w.card].count += 1;
      counts[w.card].byShow[w.showId] = (counts[w.card].byShow[w.showId] || 0) + 1;
    });
    return Object.values(counts)
      .map((c) => ({
        ...c,
        topShowId: Object.entries(c.byShow).sort((a, b) => b[1] - a[1])[0][0],
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [wants, todayShows]);

  // basic community moderation: hide a post once it's been reported a few times
  function reportWant(id) {
    setWants((prev) =>
      prev.map((w) => (w.id === id ? { ...w, reports: (w.reports || 0) + 1, hidden: (w.reports || 0) + 1 >= 3 } : w))
    );
  }

  // keyword alerts — premium/dealer accounts can watch for cards mentioning
  // specific terms across every show, not just the one they're currently viewing
  const canUseAlerts = auth.premium || auth.dealer;
  async function addKeyword(kw) {
    const clean = kw.trim();
    if (!clean || !auth.id) return;
    if (keywordAlerts.some((k) => k.toLowerCase() === clean.toLowerCase())) return;
    const { error } = await supabase.from("keyword_alerts").insert({ user_id: auth.id, keyword: clean });
    if (error) console.error("Failed to add keyword alert", error);
    // realtime INSERT event appends it to `keywordAlerts` once it lands
  }
  async function removeKeyword(kw) {
    if (!auth.id) return;
    const { error } = await supabase.from("keyword_alerts").delete().eq("user_id", auth.id).eq("keyword", kw);
    if (error) console.error("Failed to remove keyword alert", error);
  }
  const alertMatches = useMemo(() => {
    if (!canUseAlerts || keywordAlerts.length === 0) return [];
    const lowerKeywords = keywordAlerts.map((k) => k.toLowerCase());
    return wants
      .filter((w) => w.userId !== auth.id && !w.hidden)
      .filter((w) => {
        const haystack = `${w.card} ${w.detail || ""}`.toLowerCase();
        return lowerKeywords.some((k) => haystack.includes(k));
      })
      .map((w) => ({
        ...w,
        showName: SHOWS.find((s) => s.id === w.showId)?.name || "",
        matchedKeyword: keywordAlerts.find((k) => `${w.card} ${w.detail || ""}`.toLowerCase().includes(k.toLowerCase())),
      }))
      .sort((a, b) => b.ts - a.ts);
  }, [wants, keywordAlerts, canUseAlerts]);
  const unreadAlertCount = alertMatches.filter((m) => !readAlertIds.includes(m.id)).length;
  function openAlerts(origin) {
    setAlertsOrigin(origin);
    setReadAlertIds(alertMatches.map((m) => m.id));
    setScreen("alerts");
  }

  const activeShow = SHOWS.find((s) => s.id === activeShowId);

  function matchesFilters(w) {
    if (gameFilter !== "all" && w.game !== gameFilter) return false;
    if (boostedOnly && !w.boosted) return false;
    if (dealersOnly && !(w.userId === auth.id ? auth.dealer : w.posterDealer)) return false;
    if (query && !w.card.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  }

  const feedWants = wants
    .filter((w) => w.showId === activeShowId)
    .filter((w) => !w.hidden)
    .filter(matchesFilters)
    .sort((a, b) => {
      if (!!b.boosted !== !!a.boosted) return (b.boosted ? 1 : 0) - (a.boosted ? 1 : 0);
      return b.ts - a.ts;
    });

  // "search all shows" — same filters, but across every show at once, each
  // result tagged with which show it's at
  const crossShowResults = useMemo(() => {
    if (!searchAllShows || !query) return [];
    return wants
      .filter((w) => !w.hidden)
      .filter(matchesFilters)
      .map((w) => ({ ...w, showName: SHOWS.find((s) => s.id === w.showId)?.name || "" }))
      .sort((a, b) => b.ts - a.ts);
  }, [wants, searchAllShows, query, gameFilter, boostedOnly, dealersOnly, auth]);

  const activeFilterCount = (gameFilter !== "all" ? 1 : 0) + (boostedOnly ? 1 : 0) + (dealersOnly ? 1 : 0);

  const demandInsights = useMemo(() => {
    const counts = {};
    wants.filter((w) => w.showId === activeShowId).forEach((w) => {
      counts[w.card] = (counts[w.card] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
  }, [wants, activeShowId]);

  async function addWant(entry) {
    const { error } = await supabase.from("wants").insert({
      user_id: auth.id,
      show_id: activeShowId,
      game: entry.game,
      card: entry.card,
      detail: entry.detail || null,
      max_price: entry.maxPrice || null,
      boosted: !!entry.boosted,
    });
    if (error) {
      console.error("Failed to post shoutout", error);
      return;
    }
    setShowPostForm(false);
    // the realtime INSERT subscription appends it to `wants` once it lands
  }

  async function markFound(wantId) {
    const { error } = await supabase.from("wants").update({ found: true }).eq("id", wantId);
    if (error) console.error("Failed to mark want as found", error);
  }

  // "scan to search" — captures a photo and identifies the card. Real version
  // would run this through an image-recognition/OCR API server-side; this demo
  // simulates the round trip and picks a plausible match from the local dataset.
  function handleScanFile(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setScanningCard(true);
    setTimeout(() => {
      const dataset =
        gameFilter === "onepiece" ? ONE_PIECE_CARD_DATASET : gameFilter === "pokemon" ? POKEMON_CARD_DATASET : [...POKEMON_CARD_DATASET, ...ONE_PIECE_CARD_DATASET];
      setQuery(dataset[Math.floor(Math.random() * dataset.length)]);
      setScanningCard(false);
    }, 1100);
    e.target.value = "";
  }

  function openChat(userId, origin = "feed") {
    setChatOrigin(origin);
    setActiveThread(userId);
    setScreen("chat");
  }

  function sendMessage(text) {
    if (!text.trim()) return;
    setThreads((prev) => {
      const existing = prev[activeThread] || [];
      return { ...prev, [activeThread]: [...existing, { from: "me", text, ts: Date.now() }] };
    });
  }

  const myThreadIds = Object.keys(threads).filter((id) => threads[id].length > 0);
  const myWants = wants
    .filter((w) => w.userId === auth.id)
    .map((w) => ({ ...w, showName: SHOWS.find((s) => s.id === w.showId)?.name || "" }))
    .sort((a, b) => b.ts - a.ts);
  const lastShoutTs = myWants[0]?.ts || null;
  const cooldownRemainingMs = !auth.premium && lastShoutTs ? FREE_SHOUT_COOLDOWN_MS - (now - lastShoutTs) : 0;
  const onShoutCooldown = cooldownRemainingMs > 0;
  const isAccountTab =
    screen === "account" ||
    (chatOrigin === "account" && (screen === "chatlist" || screen === "chat")) ||
    (screen === "alerts" && alertsOrigin === "account");

  return (
    <div
      className="mp-app"
      style={{
        fontFamily: FONT,
        color: C.ink,
        height: "100%",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        maxWidth: "480px",
        width: "100%",
        margin: "0 auto",
        position: "relative",
        background: "#EEF1F6",
      }}
    >
      <style>{`
        * { box-sizing: border-box; }
        button { font-family: inherit; cursor: pointer; -webkit-tap-highlight-color: transparent; }
        input, textarea { font-family: inherit; }
        input::placeholder, textarea::placeholder { color: ${C.inkFaint}; }
        .mp-scroll::-webkit-scrollbar { width: 0; }
        .mp-press { transition: transform 0.12s ease, opacity 0.12s ease; }
        .mp-press:active { transform: scale(0.96); opacity: 0.85; }
        .mp-spin { animation: mp-spin 1s linear infinite; }
        @keyframes mp-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .mp-app { border-radius: 28px; }
        @media (max-width: 640px) {
          .mp-app { border-radius: 0; }
        }
      `}</style>

      {/* aurora background blobs */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: 0 }}>
        <div style={{ position: "absolute", width: 320, height: 320, top: -100, left: -80, borderRadius: "50%", background: "radial-gradient(circle, rgba(10,132,255,0.55), transparent 70%)", filter: "blur(10px)" }} />
        <div style={{ position: "absolute", width: 300, height: 300, top: 40, right: -100, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,59,48,0.35), transparent 70%)", filter: "blur(10px)" }} />
        <div style={{ position: "absolute", width: 280, height: 280, bottom: 60, left: -60, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,214,10,0.4), transparent 70%)", filter: "blur(10px)" }} />
        <div style={{ position: "absolute", width: 260, height: 260, bottom: -80, right: -60, borderRadius: "50%", background: "radial-gradient(circle, rgba(175,82,222,0.35), transparent 70%)", filter: "blur(10px)" }} />
      </div>

      {/* top glass nav bar */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          padding: "calc(16px + env(safe-area-inset-top)) 18px 16px",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "rgba(255,255,255,0.35)",
          backdropFilter: "blur(28px) saturate(180%)",
          WebkitBackdropFilter: "blur(28px) saturate(180%)",
          borderBottom: `1px solid ${C.hairline}`,
          transform: "translateZ(0)",
          WebkitTransform: "translateZ(0)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {screen !== "shows" && screen !== "account" && (
            <button
              className="mp-press"
              onClick={() => {
                if (screen === "chat") setScreen("chatlist");
                else if (screen === "chatlist") setScreen(chatOrigin);
                else if (screen === "feed") setScreen("shows");
                else if (screen === "alerts") setScreen(alertsOrigin);
              }}
              style={{ background: "rgba(255,255,255,0.6)", border: "none", borderRadius: 999, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
              aria-label="Back"
            >
              <ArrowLeft size={16} color={C.ink} />
            </button>
          )}
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>
            {screen === "shows" && "Megaphone"}
            {screen === "feed" && (activeShow?.name || "")}
            {(screen === "chatlist" || screen === "chat") && "Messages"}
            {screen === "account" && "Account"}
            {screen === "alerts" && "Card Alerts"}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {canUseAlerts && (screen === "shows" || screen === "feed" || screen === "account") && (
            <button
              className="mp-press"
              onClick={() => openAlerts(screen)}
              style={{ background: "rgba(255,255,255,0.6)", border: "none", borderRadius: 999, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
              aria-label="Card alerts"
            >
              <Bell size={17} color={C.purple} />
              {unreadAlertCount > 0 && (
                <span style={{ position: "absolute", top: 2, right: 2, background: C.red, width: 8, height: 8, borderRadius: "50%", border: "1.5px solid white" }} />
              )}
            </button>
          )}
          {(screen === "feed" || screen === "shows") && (
            <button
              className="mp-press"
              onClick={() => {
                setChatOrigin(screen);
                setScreen("chatlist");
              }}
              style={{ background: "rgba(255,255,255,0.6)", border: "none", borderRadius: 999, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
              aria-label="Messages"
            >
              <MessageCircle size={17} color={C.blue} />
              {myThreadIds.length > 0 && (
                <span style={{ position: "absolute", top: 2, right: 2, background: C.red, width: 8, height: 8, borderRadius: "50%", border: "1.5px solid white" }} />
              )}
            </button>
          )}
        </div>
      </div>

      {/* ---------------- SHOWS SCREEN ---------------- */}
      {screen === "shows" && (
        <div className="mp-scroll" style={{ position: "relative", zIndex: 1, padding: "16px 16px 90px", overflowY: "auto", flex: 1 }}>
          {trending.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, paddingLeft: 2 }}>
                <Flame size={13} color={C.red} />
                <span style={{ fontSize: 12.5, fontWeight: 700, color: C.inkSoft, textTransform: "uppercase", letterSpacing: "0.03em" }}>Trending Now</span>
              </div>
              <div className="mp-scroll" style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
                {trending.map((t) => (
                  <button
                    key={t.card}
                    className="mp-press"
                    onClick={() => {
                      setActiveShowId(t.topShowId);
                      setQuery(t.card);
                      setScreen("feed");
                    }}
                    style={{
                      flexShrink: 0,
                      background: "rgba(255,255,255,0.55)",
                      backdropFilter: "blur(20px)",
                      border: `1px solid ${C.hairline}`,
                      borderRadius: 14,
                      padding: "8px 12px",
                      textAlign: "left",
                      maxWidth: 160,
                    }}
                  >
                    <div style={{ fontSize: 12.5, fontWeight: 650, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.card}</div>
                    <div style={{ fontSize: 10.5, color: C.red, fontWeight: 700, marginTop: 2 }}>{t.count} looking</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ad banner slot */}
          {!auth.premium ? (
            <Glass
              radius={18}
              style={{
                height: 96,
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: `1.5px dashed rgba(60,60,67,0.22)`,
                background: "rgba(255,255,255,0.35)",
                boxShadow: "none",
              }}
            >
              <div style={{ textAlign: "center", color: C.inkFaint }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, letterSpacing: "0.02em" }}>AD SPACE</div>
                <div style={{ fontSize: 11, marginTop: 2 }}>320×100 banner reserved for sponsors</div>
              </div>
            </Glass>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14, color: C.gold, fontSize: 12.5, fontWeight: 650 }}>
              <Crown size={13} /> Premium — enjoying an ad-free board
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12, color: C.inkSoft, fontSize: 13, paddingLeft: 2 }}>
            <MapPin size={14} />
            {geoState === "ok" && <span>Sorted by distance from you</span>}
            {geoState === "asking" && <span>Finding shows near you…</span>}
            {geoState === "denied" && <span>Turn on location to sort by distance</span>}
          </div>

          {todayShows.length > 0 && (
            <div style={{ fontSize: 12.5, fontWeight: 700, color: C.inkSoft, textTransform: "uppercase", letterSpacing: "0.03em", margin: "4px 2px 8px" }}>
              Happening Today
            </div>
          )}
          {todayShows.map((s) => (
            <div key={s.id} className="mp-press" style={{ marginBottom: 12 }}>
              <Glass
                radius={20}
                onClick={() => {
                  setActiveShowId(s.id);
                  setScreen("feed");
                }}
                style={{ padding: "16px 18px", cursor: "pointer" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ fontSize: 17, fontWeight: 650, letterSpacing: "-0.01em" }}>{s.name}</div>
                      <span style={{ fontSize: 9.5, fontWeight: 700, color: "white", background: C.red, padding: "2px 6px", borderRadius: 6, letterSpacing: "0.02em" }}>TODAY</span>
                    </div>
                    <div style={{ fontSize: 13.5, color: C.inkSoft, marginTop: 3 }}>{s.venue}</div>
                    <div style={{ fontSize: 12, color: C.blue, marginTop: 7, fontWeight: 600 }}>{s.whenLabel}</div>
                    {s.id === "s1" && (
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 8, background: "rgba(175,82,222,0.12)", padding: "3px 8px", borderRadius: 999 }}>
                        <BadgeCheck size={11} color={C.purple} />
                        <span style={{ fontSize: 10.5, fontWeight: 650, color: C.purple }}>Official App Partner</span>
                      </div>
                    )}
                  </div>
                  {s.distance != null && (
                    <div style={{ fontFamily: MONO, fontSize: 13, color: C.inkSoft, whiteSpace: "nowrap", paddingLeft: 10 }}>
                      {s.distance.toFixed(1)} km
                    </div>
                  )}
                </div>
              </Glass>
            </div>
          ))}

          {upcomingShows.length > 0 && (
            <div style={{ fontSize: 12.5, fontWeight: 700, color: C.inkSoft, textTransform: "uppercase", letterSpacing: "0.03em", margin: "16px 2px 8px" }}>
              Coming Up
            </div>
          )}
          {upcomingShows.map((s) => (
            <div key={s.id} className="mp-press" style={{ marginBottom: 12 }}>
              <Glass
                radius={20}
                onClick={() => {
                  setActiveShowId(s.id);
                  setScreen("feed");
                }}
                style={{ padding: "16px 18px", cursor: "pointer" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: 17, fontWeight: 650, letterSpacing: "-0.01em" }}>{s.name}</div>
                    <div style={{ fontSize: 13.5, color: C.inkSoft, marginTop: 3 }}>{s.venue}</div>
                    <div style={{ fontSize: 12, color: C.blue, marginTop: 7, fontWeight: 600 }}>{s.whenLabel}</div>
                  </div>
                  {s.distance != null && (
                    <div style={{ fontFamily: MONO, fontSize: 13, color: C.inkSoft, whiteSpace: "nowrap", paddingLeft: 10 }}>
                      {s.distance.toFixed(1)} km
                    </div>
                  )}
                </div>
              </Glass>
            </div>
          ))}
        </div>
      )}

      {/* ---------------- FEED SCREEN ---------------- */}
      {screen === "feed" && (
        <>
          <div style={{ position: "relative", zIndex: 1, padding: "14px 16px 0" }}>
            <div style={{ display: "flex", gap: 8 }}>
              <Glass radius={14} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", boxShadow: "none", flex: 1, position: "relative" }}>
                <Search size={15} color={C.inkSoft} />
                <CardTypeahead
                  value={query}
                  onChange={setQuery}
                  game={gameFilter === "all" ? "pokemon" : gameFilter}
                  placeholder="Search for a Pokémon or One Piece card…"
                  style={{ border: "none", background: "none", outline: "none", flex: 1, fontSize: 14.5, color: C.ink, width: "100%" }}
                />
              </Glass>
              <input ref={scanInputRef} type="file" accept="image/*" capture="environment" onChange={handleScanFile} style={{ display: "none" }} />
              <button
                className="mp-press"
                onClick={() => scanInputRef.current && scanInputRef.current.click()}
                disabled={scanningCard}
                title="Scan a card to search"
                style={{ background: "rgba(255,255,255,0.6)", border: "none", borderRadius: 14, width: 42, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", flexShrink: 0 }}
              >
                <ScanLine size={17} color={scanningCard ? C.inkFaint : C.purple} className={scanningCard ? "mp-spin" : ""} />
              </button>
              <button
                className="mp-press"
                onClick={() => setShowFilters((v) => !v)}
                title="Filters"
                style={{ background: activeFilterCount > 0 ? "rgba(10,132,255,0.14)" : "rgba(255,255,255,0.6)", border: "none", borderRadius: 14, width: 42, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", flexShrink: 0, position: "relative" }}
              >
                <SlidersHorizontal size={17} color={activeFilterCount > 0 ? C.blue : C.inkSoft} />
                {activeFilterCount > 0 && (
                  <span style={{ position: "absolute", top: 3, right: 3, background: C.red, width: 7, height: 7, borderRadius: "50%" }} />
                )}
              </button>
            </div>

            {scanningCard && (
              <div style={{ fontSize: 11.5, color: C.purple, marginTop: 6, paddingLeft: 4, fontWeight: 600 }}>Analyzing card photo…</div>
            )}

            {showFilters && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                {[
                  { label: "All games", active: gameFilter === "all", onClick: () => setGameFilter("all") },
                  { label: "Pokémon", active: gameFilter === "pokemon", onClick: () => setGameFilter("pokemon") },
                  { label: "One Piece", active: gameFilter === "onepiece", onClick: () => setGameFilter("onepiece") },
                  { label: "🔥 Boosted", active: boostedOnly, onClick: () => setBoostedOnly((v) => !v) },
                  { label: "✓ Dealers", active: dealersOnly, onClick: () => setDealersOnly((v) => !v) },
                ].map((f) => (
                  <button
                    key={f.label}
                    className="mp-press"
                    onClick={f.onClick}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 999,
                      border: f.active ? `1.5px solid ${C.blue}` : `1px solid ${C.hairline}`,
                      background: f.active ? "rgba(10,132,255,0.12)" : "rgba(255,255,255,0.5)",
                      color: f.active ? C.blue : C.inkSoft,
                      fontSize: 12,
                      fontWeight: 650,
                    }}
                  >
                    {f.label}
                  </button>
                ))}
                <button
                  className="mp-press"
                  onClick={() => setSearchAllShows((v) => !v)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 999,
                    border: searchAllShows ? `1.5px solid ${C.purple}` : `1px solid ${C.hairline}`,
                    background: searchAllShows ? "rgba(175,82,222,0.12)" : "rgba(255,255,255,0.5)",
                    color: searchAllShows ? C.purple : C.inkSoft,
                    fontSize: 12,
                    fontWeight: 650,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <Globe size={11} /> Search all shows
                </button>
              </div>
            )}

            {!auth.premium && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, padding: "0 4px" }}>
                <span style={{ fontSize: 11.5, color: onShoutCooldown ? C.gold : C.inkSoft, fontWeight: onShoutCooldown ? 650 : 400 }}>
                  {onShoutCooldown ? `Next free shoutout in ${formatCooldown(cooldownRemainingMs)}` : "Free plan: 1 shoutout per hour"}
                </span>
                <button className="mp-press" onClick={() => setShowPaywall(true)} style={{ background: "none", border: "none", color: C.gold, fontSize: 11.5, fontWeight: 700, display: "flex", alignItems: "center", gap: 3, padding: 0 }}>
                  <Crown size={12} /> Go Premium
                </button>
              </div>
            )}
          </div>

          <div className="mp-scroll" style={{ position: "relative", zIndex: 1, padding: "14px 16px 130px", overflowY: "auto", flex: 1 }}>
            {auth.dealer && demandInsights.length > 0 && (
              <Glass radius={18} style={{ padding: "14px 16px", marginBottom: 12, border: `1px solid rgba(175,82,222,0.3)` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  <TrendingUp size={14} color={C.purple} />
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: C.purple }}>DEMAND AT THIS SHOW · DEALER INSIGHTS</div>
                </div>
                {demandInsights.map(([cardName, count]) => (
                  <div key={cardName} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0" }}>
                    <span style={{ color: C.ink }}>{cardName}</span>
                    <span style={{ color: C.inkSoft, fontFamily: MONO }}>{count} looking</span>
                  </div>
                ))}
              </Glass>
            )}

            {!auth.premium && (
              <Glass
                radius={18}
                style={{
                  padding: "14px 16px",
                  marginBottom: 12,
                  borderLeft: `4px solid ${C.gold}`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <Sparkles size={12} color={C.gold} />
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: C.gold, letterSpacing: "0.03em" }}>SPONSORED · CARD OF THE WEEK</div>
                </div>
                <div style={{ fontSize: 14.5, fontWeight: 650 }}>Get your pulls graded with PSA</div>
                <div style={{ fontSize: 12.5, color: C.inkSoft, marginTop: 3 }}>Sponsored by PSA Grading — new submitters save 20% this month.</div>
                <a href="https://www.psacard.com" target="_blank" rel="noreferrer" style={{ fontSize: 12.5, color: C.blue, fontWeight: 650, marginTop: 6, display: "inline-flex", alignItems: "center", gap: 3, textDecoration: "none" }}>
                  Learn more <ExternalLink size={11} />
                </a>
              </Glass>
            )}

            {searchAllShows && query ? (
              <>
                <div style={{ fontSize: 11.5, color: C.purple, fontWeight: 650, marginBottom: 10, display: "flex", alignItems: "center", gap: 4 }}>
                  <Globe size={12} /> Searching across every show
                </div>
                {crossShowResults.length === 0 && (
                  <div style={{ textAlign: "center", color: C.inkSoft, marginTop: 40, fontSize: 14 }}>
                    No matches anywhere right now.
                  </div>
                )}
                {crossShowResults.map((w) => (
                  <WantCard key={w.id} w={w} auth={auth} onReport={reportWant} onChat={(uid) => openChat(uid, "feed")} showName={w.showName} />
                ))}
              </>
            ) : (
              <>
                {feedWants.length === 0 && (
                  <div style={{ textAlign: "center", color: C.inkSoft, marginTop: 40, fontSize: 14 }}>
                    Nobody's called out a Pokémon or One Piece card here yet.
                    <br />
                    Be the first to shout one out.
                  </div>
                )}
                {feedWants.map((w) => (
                  <WantCard key={w.id} w={w} auth={auth} onReport={reportWant} onChat={(uid) => openChat(uid, "feed")} />
                ))}
              </>
            )}
          </div>

          <button
            className="mp-press"
            onClick={() => {
              if (!auth.loggedIn) {
                setScreen("account");
              } else if (onShoutCooldown) {
                setShowPaywall(true);
              } else {
                setShowPostForm(true);
              }
            }}
            style={{
              position: "absolute",
              zIndex: 3,
              right: 20,
              bottom: "calc(86px + env(safe-area-inset-bottom))",
              background: "linear-gradient(135deg, #FF453A, #FF9500)",
              color: "white",
              border: "1px solid rgba(255,255,255,0.4)",
              borderRadius: 999,
              padding: "14px 20px",
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontWeight: 650,
              fontSize: 14.5,
              boxShadow: "0 8px 22px rgba(255,69,58,0.4)",
            }}
          >
            <Megaphone size={17} /> Shout out a card
          </button>
        </>
      )}

      {/* ---------------- CHAT LIST ---------------- */}
      {screen === "chatlist" && (
        <div className="mp-scroll" style={{ position: "relative", zIndex: 1, padding: "16px 16px 90px", overflowY: "auto", flex: 1 }}>
          {myThreadIds.length === 0 && (
            <div style={{ textAlign: "center", color: C.inkSoft, marginTop: 40, fontSize: 14 }}>
              No conversations yet. Tap "I've got one" on a want to start one.
            </div>
          )}
          {myThreadIds.map((uid) => {
            const msgs = threads[uid];
            const last = msgs[msgs.length - 1];
            return (
              <div key={uid} className="mp-press" style={{ marginBottom: 10 }}>
                <Glass radius={18} onClick={() => openChat(uid, chatOrigin)} style={{ padding: "14px 16px", cursor: "pointer" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div style={{ fontWeight: 650, fontSize: 15 }}>{personName(uid)}</div>
                    <div style={{ fontFamily: MONO, fontSize: 10.5, color: C.inkFaint }}>{timeAgo(last.ts)}</div>
                  </div>
                  <div style={{ fontSize: 13, color: C.inkSoft, marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {last.from === "me" ? "You: " : ""}
                    {last.text}
                  </div>
                </Glass>
              </div>
            );
          })}
        </div>
      )}

      {/* ---------------- CHAT THREAD ---------------- */}
      {screen === "chat" && activeThread && <ChatThread otherId={activeThread} messages={threads[activeThread] || []} onSend={sendMessage} />}

      {/* ---------------- ACCOUNT SCREEN ---------------- */}
      {screen === "account" && (
        <AccountScreen
          auth={auth}
          onSendMagicLink={sendMagicLink}
          onLogout={() => supabase.auth.signOut()}
          onTogglePremium={() => setProfileFlag("premium", !auth.premium)}
          onToggleDealer={() => setProfileFlag("dealer", !auth.dealer)}
          onOpenPremiumPerks={() => setPlanPerks("premium")}
          onOpenDealerPerks={() => setPlanPerks("dealer")}
          myWants={myWants}
          myThreadIds={myThreadIds}
          threads={threads}
          onOpenChat={(uid) => openChat(uid, "account")}
          onMarkFound={markFound}
          canUseAlerts={canUseAlerts}
          keywordAlerts={keywordAlerts}
          onAddKeyword={addKeyword}
          onRemoveKeyword={removeKeyword}
          watchlist={watchlist}
          onAddToWatchlist={addToWatchlist}
          onRemoveFromWatchlist={removeFromWatchlist}
        />
      )}

      {/* ---------------- CARD ALERTS SCREEN ---------------- */}
      {screen === "alerts" && (
        <AlertsScreen
          canUseAlerts={canUseAlerts}
          keywordAlerts={keywordAlerts}
          onAddKeyword={addKeyword}
          onRemoveKeyword={removeKeyword}
          alertMatches={alertMatches}
          onOpenChat={(uid) => openChat(uid, alertsOrigin)}
        />
      )}

      {/* ---------------- BOTTOM TAB BAR ---------------- */}
      <div
        style={{
          position: "relative",
          zIndex: 4,
          flexShrink: 0,
          display: "flex",
          background: "rgba(255,255,255,0.45)",
          backdropFilter: "blur(28px) saturate(180%)",
          WebkitBackdropFilter: "blur(28px) saturate(180%)",
          borderTop: `1px solid ${C.hairline}`,
          padding: "8px 0 calc(10px + env(safe-area-inset-bottom))",
          transform: "translateZ(0)",
          WebkitTransform: "translateZ(0)",
        }}
      >
        <button
          className="mp-press"
          onClick={() => setScreen("shows")}
          style={{ flex: 1, background: "none", border: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "6px 0" }}
        >
          <Megaphone size={20} color={!isAccountTab ? C.blue : C.inkFaint} />
          <span style={{ fontSize: 11, fontWeight: 600, color: !isAccountTab ? C.blue : C.inkFaint }}>Discover</span>
        </button>
        <button
          className="mp-press"
          onClick={() => setScreen("account")}
          style={{ flex: 1, background: "none", border: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "6px 0" }}
        >
          <User size={20} color={isAccountTab ? C.blue : C.inkFaint} />
          <span style={{ fontSize: 11, fontWeight: 600, color: isAccountTab ? C.blue : C.inkFaint }}>Account</span>
        </button>
      </div>

      {/* ---------------- FOOTER ---------------- */}
      <div
        style={{
          position: "relative",
          zIndex: 4,
          flexShrink: 0,
          textAlign: "center",
          background: "rgba(255,255,255,0.45)",
          padding: "4px 0 8px",
          fontSize: 10.5,
          fontWeight: 600,
          letterSpacing: "0.02em",
          color: C.inkFaint,
        }}
      >
        Product of xebec.rocks
      </div>

      {/* ---------------- POST FORM MODAL ---------------- */}
      {showPostForm && <PostForm onClose={() => setShowPostForm(false)} onSubmit={addWant} watchlist={watchlist} />}

      {/* ---------------- PAYWALL MODAL ---------------- */}
      {showPaywall && (
        <Paywall
          waitLabel={onShoutCooldown ? formatCooldown(cooldownRemainingMs) : null}
          onClose={() => setShowPaywall(false)}
          onUpgrade={() => {
            setAuth((prev) => ({ ...prev, premium: true }));
            setShowPaywall(false);
            setShowPostForm(true);
          }}
        />
      )}

      {/* ---------------- PLAN PERKS MODAL ---------------- */}
      {planPerks && (
        <PlanPerks
          kind={planPerks}
          onClose={() => setPlanPerks(null)}
          onProceed={() => {
            setProfileFlag(planPerks, true);
            setPlanPerks(null);
          }}
        />
      )}
    </div>
  );
}

function ChatThread({ otherId, messages, onSend }) {
  const [text, setText] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  return (
    <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <div style={{ padding: "10px 18px", fontWeight: 650, fontSize: 15 }}>{personName(otherId)}</div>
      <div className="mp-scroll" style={{ flex: 1, overflowY: "auto", padding: "6px 16px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", color: C.inkSoft, fontSize: 13.5, marginTop: 30 }}>
            Say hi — mention the card you're chatting about.
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              alignSelf: m.from === "me" ? "flex-end" : "flex-start",
              background: m.from === "me" ? C.blue : "rgba(255,255,255,0.7)",
              backdropFilter: m.from === "me" ? "none" : "blur(10px)",
              color: m.from === "me" ? "white" : C.ink,
              border: m.from === "me" ? "none" : `1px solid ${C.hairline}`,
              borderRadius: 18,
              padding: "9px 14px",
              maxWidth: "78%",
              fontSize: 14.5,
              lineHeight: 1.35,
              boxShadow: m.from === "me" ? "0 3px 10px rgba(10,132,255,0.3)" : "0 2px 6px rgba(0,0,0,0.04)",
            }}
          >
            {m.text}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div style={{ display: "flex", gap: 8, padding: 14 }}>
        <Glass radius={22} style={{ flex: 1, boxShadow: "none" }}>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onSend(text);
                setText("");
              }
            }}
            placeholder="Message…"
            style={{ width: "100%", border: "none", background: "none", borderRadius: 22, padding: "11px 16px", fontSize: 14.5, outline: "none" }}
          />
        </Glass>
        <button
          className="mp-press"
          onClick={() => {
            onSend(text);
            setText("");
          }}
          style={{ background: C.blue, color: "white", border: "none", borderRadius: 999, width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(10,132,255,0.4)" }}
          aria-label="Send"
        >
          <Send size={17} />
        </button>
      </div>
    </div>
  );
}

function AccountScreen({ auth, onSendMagicLink, onLogout, onTogglePremium, onToggleDealer, onOpenPremiumPerks, onOpenDealerPerks, myWants, myThreadIds, threads, onOpenChat, onMarkFound, canUseAlerts, keywordAlerts, onAddKeyword, onRemoveKeyword, watchlist, onAddToWatchlist, onRemoveFromWatchlist }) {
  const [view, setView] = useState("shoutouts");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [linkSent, setLinkSent] = useState(false);
  const [authError, setAuthError] = useState("");

  async function handleSendLink() {
    setSending(true);
    setAuthError("");
    try {
      await onSendMagicLink(name.trim(), email.trim());
      setLinkSent(true);
    } catch (err) {
      setAuthError(err.message || "Couldn't send the login link. Try again.");
    } finally {
      setSending(false);
    }
  }

  const fieldStyle = {
    width: "100%",
    marginTop: 6,
    marginBottom: 14,
    border: `1px solid ${C.hairline}`,
    background: "rgba(255,255,255,0.6)",
    borderRadius: 12,
    padding: "11px 14px",
    fontSize: 14.5,
    outline: "none",
    boxSizing: "border-box",
    fontFamily: FONT,
  };

  if (!auth.loggedIn) {
    return (
      <div className="mp-scroll" style={{ position: "relative", zIndex: 1, padding: "20px 16px 90px", overflowY: "auto", flex: 1 }}>
        <Glass radius={22} style={{ padding: "22px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <Sparkles size={16} color={C.blue} />
            <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.01em" }}>Sign in to Megaphone</div>
          </div>
          <div style={{ fontSize: 13.5, color: C.inkSoft, marginBottom: 16, lineHeight: 1.4 }}>
            Track your own shoutouts and pick up chats right where you left off.
          </div>

          {linkSent ? (
            <div style={{ textAlign: "center", padding: "12px 4px" }}>
              <Check size={22} color={C.green} style={{ marginBottom: 8 }} />
              <div style={{ fontSize: 14.5, fontWeight: 650, marginBottom: 4 }}>Check your email</div>
              <div style={{ fontSize: 13, color: C.inkSoft, lineHeight: 1.4 }}>
                We sent a login link to <strong>{email}</strong>. Open it on this device to sign in.
              </div>
              <button
                className="mp-press"
                onClick={() => setLinkSent(false)}
                style={{ marginTop: 14, background: "none", border: "none", color: C.blue, fontSize: 13, fontWeight: 650, padding: 0 }}
              >
                Use a different email
              </button>
            </div>
          ) : (
            <>
              <label style={{ fontSize: 12, fontWeight: 600, color: C.inkSoft }}>Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ash K." style={fieldStyle} />

              <label style={{ fontSize: 12, fontWeight: 600, color: C.inkSoft }}>Email</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" style={fieldStyle} />

              {authError && (
                <div style={{ fontSize: 12.5, color: C.red, marginBottom: 12, fontWeight: 600 }}>{authError}</div>
              )}

              <button
                className="mp-press"
                disabled={!name.trim() || !email.trim() || sending}
                onClick={handleSendLink}
                style={{
                  width: "100%",
                  background: name.trim() && email.trim() && !sending ? C.blue : "rgba(120,120,128,0.25)",
                  color: "white",
                  border: "none",
                  borderRadius: 14,
                  padding: "13px",
                  fontWeight: 650,
                  fontSize: 15,
                  boxShadow: name.trim() && email.trim() ? "0 6px 16px rgba(10,132,255,0.35)" : "none",
                }}
              >
                {sending ? "Sending…" : "Email me a login link"}
              </button>
              <div style={{ fontSize: 11.5, color: C.inkFaint, marginTop: 10, textAlign: "center" }}>
                No password — we'll email you a secure link to sign in.
              </div>
            </>
          )}
        </Glass>
      </div>
    );
  }

  const initials = auth.name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="mp-scroll" style={{ position: "relative", zIndex: 1, padding: "16px 16px 90px", overflowY: "auto", flex: 1 }}>
      <Glass radius={22} style={{ padding: "18px 18px", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #FF453A, #FF9500)",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: 17,
              flexShrink: 0,
            }}
          >
            {initials || "?"}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16.5, fontWeight: 650 }}>{auth.name}</div>
            <div style={{ fontSize: 12.5, color: C.inkSoft, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{auth.email}</div>
          </div>
          <button
            className="mp-press"
            onClick={onLogout}
            style={{ background: "rgba(120,120,128,0.16)", border: "none", borderRadius: 999, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
            aria-label="Log out"
          >
            <LogOut size={15} color={C.inkSoft} />
          </button>
        </div>
      </Glass>

      {/* premium subscription */}
      <Glass
        radius={18}
        onClick={!auth.premium ? onOpenPremiumPerks : undefined}
        style={{
          padding: "14px 16px",
          marginBottom: 10,
          border: auth.premium ? `1px solid ${C.gold}` : undefined,
          cursor: !auth.premium ? "pointer" : undefined,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(201,138,11,0.14)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Crown size={17} color={C.gold} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14.5, fontWeight: 650 }}>{auth.premium ? "Premium — active" : "Megaphone Premium"}</div>
            <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 1 }}>
              {auth.premium ? "Post anytime, no ads." : "Post anytime + no ads — $4.99/mo"}
            </div>
          </div>
          <button
            className="mp-press"
            onClick={(e) => {
              e.stopPropagation();
              if (auth.premium) onTogglePremium();
              else onOpenPremiumPerks();
            }}
            style={{
              background: auth.premium ? "rgba(120,120,128,0.16)" : "linear-gradient(135deg, #C98A0B, #FFD60A)",
              color: auth.premium ? C.inkSoft : "#3A2900",
              border: "none",
              borderRadius: 999,
              padding: "7px 12px",
              fontSize: 12,
              fontWeight: 700,
              flexShrink: 0,
              whiteSpace: "nowrap",
            }}
          >
            {auth.premium ? "Cancel" : "Upgrade"}
          </button>
        </div>
      </Glass>

      {/* verified dealer subscription */}
      <Glass
        radius={18}
        onClick={!auth.dealer ? onOpenDealerPerks : undefined}
        style={{
          padding: "14px 16px",
          marginBottom: 16,
          border: auth.dealer ? `1px solid ${C.purple}` : undefined,
          cursor: !auth.dealer ? "pointer" : undefined,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(175,82,222,0.14)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <BadgeCheck size={17} color={C.purple} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14.5, fontWeight: 650 }}>{auth.dealer ? "Verified Dealer — active" : "Become a Verified Dealer"}</div>
            <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 1 }}>
              {auth.dealer ? "Badge live, demand insights unlocked." : "Verified badge + demand insights — $9.99/mo"}
            </div>
          </div>
          <button
            className="mp-press"
            onClick={(e) => {
              e.stopPropagation();
              if (auth.dealer) onToggleDealer();
              else onOpenDealerPerks();
            }}
            style={{
              background: auth.dealer ? "rgba(120,120,128,0.16)" : C.purple,
              color: auth.dealer ? C.inkSoft : "white",
              border: "none",
              borderRadius: 999,
              padding: "7px 12px",
              fontSize: 12,
              fontWeight: 700,
              flexShrink: 0,
              whiteSpace: "nowrap",
            }}
          >
            {auth.dealer ? "Cancel" : "Upgrade"}
          </button>
        </div>
      </Glass>

      {/* keyword alerts */}
      <Glass radius={18} style={{ padding: "14px 16px", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(10,132,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Bell size={17} color={C.blue} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14.5, fontWeight: 650 }}>Keyword Alerts</div>
            <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 1 }}>
              {canUseAlerts ? "Get notified when a shoutout matches these terms." : "Premium & Verified Dealer feature"}
            </div>
          </div>
        </div>

        {canUseAlerts ? (
          <KeywordAlertsEditor keywordAlerts={keywordAlerts} onAdd={onAddKeyword} onRemove={onRemoveKeyword} />
        ) : (
          <div style={{ fontSize: 12.5, color: C.inkSoft, marginTop: 8, lineHeight: 1.4 }}>
            Upgrade to Premium or Verified Dealer above to watch for cards — e.g. sellers holding an OP-05 Manga Luffy can turn on an alert for "Luffy" and get pinged the moment someone shouts it out at any show.
          </div>
        )}
      </Glass>

      <Glass radius={14} style={{ display: "flex", padding: 4, marginBottom: 14, boxShadow: "none" }}>
        {["shoutouts", "wantlist", "chats"].map((v) => (
          <button
            key={v}
            className="mp-press"
            onClick={() => setView(v)}
            style={{
              flex: 1,
              background: view === v ? "rgba(255,255,255,0.9)" : "none",
              border: "none",
              borderRadius: 11,
              padding: "9px 0",
              fontSize: 13.5,
              fontWeight: 650,
              color: view === v ? C.ink : C.inkSoft,
              boxShadow: view === v ? "0 2px 6px rgba(0,0,0,0.08)" : "none",
            }}
          >
            {v === "shoutouts" ? "My Shoutouts" : v === "wantlist" ? "Want List" : "Chats"}
          </button>
        ))}
      </Glass>

      {view === "wantlist" && (
        <WantListEditor watchlist={watchlist} onAdd={onAddToWatchlist} onRemove={onRemoveFromWatchlist} />
      )}

      {view === "shoutouts" && (
        <>
          {myWants.length === 0 && (
            <div style={{ textAlign: "center", color: C.inkSoft, marginTop: 30, fontSize: 14 }}>
              You haven't shouted out any cards yet.
            </div>
          )}
          {myWants.map((w) => (
            <div key={w.id} style={{ marginBottom: 12 }}>
              <Glass radius={18} style={{ padding: "14px 16px" }}>
                {w.boosted && (
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 8, color: C.gold, fontSize: 10.5, fontWeight: 700 }}>
                    <Pin size={11} /> BOOSTED
                  </div>
                )}
                <div style={{ fontSize: 15.5, fontWeight: 650, letterSpacing: "-0.01em" }}>{w.card}</div>
                {w.detail && <div style={{ fontSize: 13, color: C.inkSoft, marginTop: 4 }}>{w.detail}</div>}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
                  <div style={{ fontSize: 12.5, color: C.blue, fontWeight: 600 }}>{w.showName}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {w.maxPrice && (
                      <div style={{ fontFamily: MONO, fontSize: 12, color: C.gold, fontWeight: 700 }}>up to {w.maxPrice}</div>
                    )}
                    <div style={{ fontFamily: MONO, fontSize: 10.5, color: C.inkFaint }}>{timeAgo(w.ts)}</div>
                  </div>
                </div>
                {w.found ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.hairline}`, color: C.green, fontSize: 12.5, fontWeight: 650 }}>
                    <PartyPopper size={13} /> Found — nice pickup!
                  </div>
                ) : (
                  <button
                    className="mp-press"
                    onClick={() => onMarkFound(w.id)}
                    style={{ marginTop: 10, paddingTop: 10, width: "100%", background: "none", border: "none", borderTop: `1px solid ${C.hairline}`, color: C.green, fontSize: 12.5, fontWeight: 650, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}
                  >
                    <Check size={13} /> Mark as found
                  </button>
                )}
              </Glass>
            </div>
          ))}
        </>
      )}

      {view === "chats" && (
        <>
          {myThreadIds.length === 0 && (
            <div style={{ textAlign: "center", color: C.inkSoft, marginTop: 30, fontSize: 14 }}>
              No conversations yet.
            </div>
          )}
          {myThreadIds.map((uid) => {
            const msgs = threads[uid];
            const last = msgs[msgs.length - 1];
            return (
              <div key={uid} className="mp-press" style={{ marginBottom: 10 }}>
                <Glass radius={18} onClick={() => onOpenChat(uid)} style={{ padding: "14px 16px", cursor: "pointer" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div style={{ fontWeight: 650, fontSize: 15 }}>{personName(uid)}</div>
                    <div style={{ fontFamily: MONO, fontSize: 10.5, color: C.inkFaint }}>{timeAgo(last.ts)}</div>
                  </div>
                  <div style={{ fontSize: 13, color: C.inkSoft, marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {last.from === "me" ? "You: " : ""}
                    {last.text}
                  </div>
                </Glass>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

// personal want list — cards a collector is hunting for, prepped ahead of a
// show so they can be quick-selected straight onto the board (see PostForm)
function WantListEditor({ watchlist, onAdd, onRemove }) {
  const [game, setGame] = useState("pokemon");
  const [card, setCard] = useState("");
  const [detail, setDetail] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  function handleAdd() {
    if (!card.trim()) return;
    onAdd({ game, card, detail, maxPrice });
    setCard("");
    setDetail("");
    setMaxPrice("");
  }

  const fieldStyle = {
    width: "100%",
    marginTop: 6,
    marginBottom: 10,
    border: `1px solid ${C.hairline}`,
    background: "rgba(255,255,255,0.6)",
    borderRadius: 12,
    padding: "10px 13px",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
    fontFamily: FONT,
  };

  return (
    <>
      <Glass radius={18} style={{ padding: "14px 16px", marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 650, marginBottom: 2 }}>Add a card</div>
        <div style={{ fontSize: 12, color: C.inkSoft, marginBottom: 10, lineHeight: 1.4 }}>
          Build your list before you head out — at the show, quick-select from it instead of retyping.
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
          {[
            { id: "pokemon", label: "Pokémon" },
            { id: "onepiece", label: "One Piece" },
          ].map((g) => (
            <button
              key={g.id}
              className="mp-press"
              onClick={() => {
                setGame(g.id);
                setCard("");
              }}
              style={{
                flex: 1,
                padding: "8px 0",
                borderRadius: 10,
                border: game === g.id ? `1.5px solid ${C.blue}` : `1px solid ${C.hairline}`,
                background: game === g.id ? "rgba(10,132,255,0.1)" : "rgba(255,255,255,0.5)",
                color: game === g.id ? C.blue : C.inkSoft,
                fontSize: 13,
                fontWeight: 650,
              }}
            >
              {g.label}
            </button>
          ))}
        </div>
        <CardTypeahead value={card} onChange={setCard} game={game} placeholder="Card name…" style={fieldStyle} />
        <input value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="Details (optional)" style={fieldStyle} />
        <input value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="Budget (optional)" style={fieldStyle} />
        <button
          className="mp-press"
          disabled={!card.trim()}
          onClick={handleAdd}
          style={{
            width: "100%",
            background: card.trim() ? C.blue : "rgba(120,120,128,0.25)",
            color: "white",
            border: "none",
            borderRadius: 12,
            padding: "11px",
            fontWeight: 650,
            fontSize: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <Plus size={15} /> Add to want list
        </button>
      </Glass>

      {watchlist.length === 0 ? (
        <div style={{ textAlign: "center", color: C.inkSoft, marginTop: 20, fontSize: 14 }}>
          Your want list is empty — add cards above so they're ready to quick-select at your next show.
        </div>
      ) : (
        watchlist.map((w) => (
          <div key={w.id} style={{ marginBottom: 10 }}>
            <Glass radius={16} style={{ padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 650 }}>{w.card}</div>
                <div style={{ fontSize: 11.5, color: C.inkFaint, marginTop: 2 }}>
                  {w.game === "onepiece" ? "One Piece" : "Pokémon"}
                  {w.maxPrice && ` · up to ${w.maxPrice}`}
                </div>
                {w.detail && <div style={{ fontSize: 12.5, color: C.inkSoft, marginTop: 4 }}>{w.detail}</div>}
              </div>
              <button
                className="mp-press"
                onClick={() => onRemove(w.id)}
                style={{ background: "rgba(120,120,128,0.16)", border: "none", borderRadius: 999, width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                aria-label={`Remove ${w.card}`}
              >
                <X size={13} color={C.inkSoft} />
              </button>
            </Glass>
          </div>
        ))
      )}
    </>
  );
}

function KeywordAlertsEditor({ keywordAlerts, onAdd, onRemove }) {
  const [input, setInput] = useState("");
  return (
    <div style={{ marginTop: 10 }}>
      {keywordAlerts.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
          {keywordAlerts.map((kw) => (
            <div
              key={kw}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                background: "rgba(10,132,255,0.12)",
                color: C.blue,
                padding: "5px 10px",
                borderRadius: 999,
                fontSize: 12.5,
                fontWeight: 650,
              }}
            >
              {kw}
              <button className="mp-press" onClick={() => onRemove(kw)} style={{ background: "none", border: "none", padding: 0, display: "flex", color: C.blue }} aria-label={`Remove ${kw}`}>
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onAdd(input);
              setInput("");
            }
          }}
          placeholder="e.g. Luffy, Charizard, Umbreon…"
          style={{ flex: 1, border: `1px solid ${C.hairline}`, background: "rgba(255,255,255,0.6)", borderRadius: 10, padding: "9px 12px", fontSize: 13.5, outline: "none", fontFamily: FONT }}
        />
        <button
          className="mp-press"
          onClick={() => {
            onAdd(input);
            setInput("");
          }}
          disabled={!input.trim()}
          style={{ background: input.trim() ? C.blue : "rgba(120,120,128,0.25)", color: "white", border: "none", borderRadius: 10, width: 38, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
          aria-label="Add keyword"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}

function AlertsScreen({ canUseAlerts, keywordAlerts, onAddKeyword, onRemoveKeyword, alertMatches, onOpenChat }) {
  if (!canUseAlerts) {
    return (
      <div className="mp-scroll" style={{ position: "relative", zIndex: 1, padding: "20px 16px 90px", overflowY: "auto", flex: 1 }}>
        <Glass radius={22} style={{ padding: "22px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <Bell size={16} color={C.blue} />
            <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.01em" }}>Card Alerts</div>
          </div>
          <div style={{ fontSize: 13.5, color: C.inkSoft, lineHeight: 1.4 }}>
            Keyword alerts are a Premium and Verified Dealer feature — go to Account to upgrade, then watch for terms like "Luffy" or "Charizard" and get pinged the instant someone shouts one out at any show.
          </div>
        </Glass>
      </div>
    );
  }

  return (
    <div className="mp-scroll" style={{ position: "relative", zIndex: 1, padding: "16px 16px 90px", overflowY: "auto", flex: 1 }}>
      <Glass radius={18} style={{ padding: "14px 16px", marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 650, marginBottom: 2 }}>Watching for</div>
        <div style={{ fontSize: 12, color: C.inkSoft, marginBottom: 8 }}>Matches search both the card name and details, across every show.</div>
        <KeywordAlertsEditor keywordAlerts={keywordAlerts} onAdd={onAddKeyword} onRemove={onRemoveKeyword} />
      </Glass>

      {keywordAlerts.length === 0 ? (
        <div style={{ textAlign: "center", color: C.inkSoft, marginTop: 20, fontSize: 14 }}>
          Add a keyword above to start getting alerts.
        </div>
      ) : alertMatches.length === 0 ? (
        <div style={{ textAlign: "center", color: C.inkSoft, marginTop: 20, fontSize: 14 }}>
          No matches yet — we'll notify you the moment someone shouts one of these out.
        </div>
      ) : (
        alertMatches.map((m) => (
          <div key={m.id} style={{ marginBottom: 12 }}>
            <Glass radius={18} style={{ padding: "14px 16px", border: `1px solid rgba(10,132,255,0.25)` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
                <Bell size={11} color={C.blue} />
                <span style={{ fontSize: 10.5, fontWeight: 700, color: C.blue, letterSpacing: "0.02em" }}>MATCHED "{m.matchedKeyword.toUpperCase()}"</span>
              </div>
              <div style={{ fontSize: 15.5, fontWeight: 650, letterSpacing: "-0.01em" }}>{m.card}</div>
              {m.detail && <div style={{ fontSize: 13, color: C.inkSoft, marginTop: 4 }}>{m.detail}</div>}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 600 }}>{m.posterName || "A collector"} · {m.showName}</div>
                  <div style={{ fontFamily: MONO, fontSize: 10.5, color: C.inkFaint }}>{timeAgo(m.ts)}</div>
                </div>
                <button
                  className="mp-press"
                  onClick={() => onOpenChat(m.userId)}
                  style={{ background: C.blue, color: "white", border: "none", borderRadius: 999, padding: "8px 14px", fontSize: 12.5, fontWeight: 650, display: "flex", alignItems: "center", gap: 5 }}
                >
                  <MessageCircle size={13} /> Message
                </button>
              </div>
            </Glass>
          </div>
        ))
      )}
    </div>
  );
}

function PostForm({ onClose, onSubmit, watchlist = [] }) {
  const [card, setCard] = useState("");
  const [game, setGame] = useState("pokemon");
  const [detail, setDetail] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [boost, setBoost] = useState(false);
  const [error, setError] = useState("");

  function handleSubmit() {
    const combined = `${card} ${detail}`;
    if (violatesContentPolicy(combined)) {
      setError("This doesn't look like an on-topic card shoutout. Please keep posts focused on Pokémon or One Piece cards.");
      return;
    }
    setError("");
    onSubmit({ card: card.trim(), game, detail: detail.trim(), maxPrice: maxPrice.trim(), boosted: boost });
  }

  const fieldStyle = {
    width: "100%",
    marginTop: 6,
    marginBottom: 14,
    border: `1px solid ${C.hairline}`,
    background: "rgba(255,255,255,0.6)",
    borderRadius: 12,
    padding: "11px 14px",
    fontSize: 14.5,
    outline: "none",
    boxSizing: "border-box",
    fontFamily: FONT,
  };

  return (
    <div
      style={{ position: "absolute", inset: 0, background: "rgba(28,28,30,0.35)", backdropFilter: "blur(4px)", display: "flex", alignItems: "flex-end", zIndex: 10, borderRadius: 28 }}
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%" }}>
        <Glass
          strong
          radius={0}
          style={{
            borderTopLeftRadius: 26,
            borderTopRightRadius: 26,
            borderBottom: "none",
            borderLeft: "none",
            borderRight: "none",
            padding: "10px 20px calc(24px + env(safe-area-inset-bottom))",
            maxHeight: "82dvh",
            overflowY: "auto",
          }}
        >
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(60,60,67,0.25)", margin: "0 auto 16px" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.01em" }}>Shout it out</div>
            <button className="mp-press" onClick={onClose} style={{ background: "rgba(120,120,128,0.16)", border: "none", borderRadius: 999, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <X size={15} color={C.inkSoft} />
            </button>
          </div>

          {watchlist.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: C.inkSoft }}>Quick pick from your want list</label>
              <div className="mp-scroll" style={{ display: "flex", gap: 8, overflowX: "auto", marginTop: 8, paddingBottom: 2 }}>
                {watchlist.map((w) => (
                  <button
                    key={w.id}
                    className="mp-press"
                    onClick={() => {
                      setGame(w.game || "pokemon");
                      setCard(w.card);
                      setDetail(w.detail || "");
                      setMaxPrice(w.maxPrice || "");
                    }}
                    style={{
                      flexShrink: 0,
                      background: "rgba(10,132,255,0.08)",
                      border: `1px solid ${C.hairline}`,
                      borderRadius: 12,
                      padding: "8px 12px",
                      textAlign: "left",
                      maxWidth: 170,
                    }}
                  >
                    <div style={{ fontSize: 12.5, fontWeight: 650, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{w.card}</div>
                    <div style={{ fontSize: 10, color: C.inkFaint, marginTop: 1 }}>{w.game === "onepiece" ? "One Piece" : "Pokémon"}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <label style={{ fontSize: 12, fontWeight: 600, color: C.inkSoft }}>Which game?</label>
          <div style={{ display: "flex", gap: 8, marginTop: 6, marginBottom: 14 }}>
            {[
              { id: "pokemon", label: "Pokémon" },
              { id: "onepiece", label: "One Piece" },
            ].map((g) => (
              <button
                key={g.id}
                className="mp-press"
                onClick={() => {
                  setGame(g.id);
                  setCard("");
                }}
                style={{
                  flex: 1,
                  padding: "10px 0",
                  borderRadius: 10,
                  border: game === g.id ? `1.5px solid ${C.blue}` : `1px solid ${C.hairline}`,
                  background: game === g.id ? "rgba(10,132,255,0.1)" : "rgba(255,255,255,0.5)",
                  color: game === g.id ? C.blue : C.inkSoft,
                  fontSize: 13.5,
                  fontWeight: 650,
                }}
              >
                {g.label}
              </button>
            ))}
          </div>

          <label style={{ fontSize: 12, fontWeight: 600, color: C.inkSoft }}>Card you're looking for</label>
          <CardTypeahead
            value={card}
            onChange={setCard}
            game={game}
            placeholder={game === "onepiece" ? "e.g. Luffy Gear 5 Alt Art" : "e.g. Charizard VMAX Rainbow Rare"}
            style={fieldStyle}
          />

          <label style={{ fontSize: 12, fontWeight: 600, color: C.inkSoft }}>Details (condition, grade, notes)</label>
          <textarea value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="Any grade, prefer PSA 9+, will trade too…" rows={2} style={{ ...fieldStyle, resize: "none" }} />

          <label style={{ fontSize: 12, fontWeight: 600, color: C.inkSoft }}>Budget (optional)</label>
          <input value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="up to $500" style={fieldStyle} />

          <button
            className="mp-press"
            onClick={() => setBoost((b) => !b)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 16,
              padding: "12px 14px",
              borderRadius: 12,
              border: boost ? `1.5px solid ${C.gold}` : `1px solid ${C.hairline}`,
              background: boost ? "rgba(201,138,11,0.1)" : "rgba(255,255,255,0.5)",
              textAlign: "left",
            }}
          >
            <Pin size={16} color={C.gold} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 650 }}>Boost to top of board</div>
              <div style={{ fontSize: 11.5, color: C.inkSoft }}>Pin your shoutout above the rest for a few hours — $1.99</div>
            </div>
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: 999,
                border: `2px solid ${boost ? C.gold : C.hairline}`,
                background: boost ? C.gold : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {boost && <Check size={13} color="white" />}
            </div>
          </button>

          {error && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 12, padding: "10px 12px", background: "rgba(255,59,48,0.1)", borderRadius: 10, color: C.red, fontSize: 12.5, fontWeight: 600 }}>
              <Flag size={13} style={{ marginTop: 1, flexShrink: 0 }} /> {error}
            </div>
          )}

          <button
            className="mp-press"
            disabled={!card.trim()}
            onClick={handleSubmit}
            style={{
              width: "100%",
              background: card.trim() ? "linear-gradient(135deg, #FF453A, #FF9500)" : "rgba(120,120,128,0.25)",
              color: "white",
              border: "none",
              borderRadius: 14,
              padding: "14px",
              fontWeight: 650,
              fontSize: 15.5,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              boxShadow: card.trim() ? "0 6px 18px rgba(255,69,58,0.35)" : "none",
            }}
          >
            <Check size={17} /> {boost ? "Post & Boost ($1.99)" : "Post to the board"}
          </button>
        </Glass>
      </div>
    </div>
  );
}

function Paywall({ waitLabel, onClose, onUpgrade }) {
  return (
    <div
      style={{ position: "absolute", inset: 0, background: "rgba(28,28,30,0.35)", backdropFilter: "blur(4px)", display: "flex", alignItems: "flex-end", zIndex: 10, borderRadius: 28 }}
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%" }}>
        <Glass
          strong
          radius={0}
          style={{
            borderTopLeftRadius: 26,
            borderTopRightRadius: 26,
            borderBottom: "none",
            borderLeft: "none",
            borderRight: "none",
            padding: "10px 20px calc(28px + env(safe-area-inset-bottom))",
          }}
        >
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(60,60,67,0.25)", margin: "0 auto 16px" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Crown size={20} color={C.gold} />
              <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: "-0.01em" }}>{waitLabel ? "You're on cooldown" : "Go Premium"}</div>
            </div>
            <button className="mp-press" onClick={onClose} style={{ background: "rgba(120,120,128,0.16)", border: "none", borderRadius: 999, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <X size={15} color={C.inkSoft} />
            </button>
          </div>
          <div style={{ fontSize: 13.5, color: C.inkSoft, marginBottom: 16, lineHeight: 1.4 }}>
            {waitLabel
              ? `Free accounts can shout out one card per hour — you can post again in ${waitLabel}. Go Premium to post anytime, no wait.`
              : "Free accounts can shout out one card per hour. Go Premium to post anytime, no wait, plus an ad-free board."}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
            {["Post anytime — no 1-hour wait", "No ads, ever", "Priority match alerts"].map((b) => (
              <div key={b} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5 }}>
                <Check size={14} color={C.green} /> {b}
              </div>
            ))}
          </div>

          <button
            className="mp-press"
            onClick={onUpgrade}
            style={{
              width: "100%",
              background: "linear-gradient(135deg, #C98A0B, #FFD60A)",
              color: "#3A2900",
              border: "none",
              borderRadius: 14,
              padding: "14px",
              fontWeight: 700,
              fontSize: 15.5,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              boxShadow: "0 6px 18px rgba(201,138,11,0.35)",
              marginBottom: 8,
            }}
          >
            <Crown size={17} /> Upgrade — $4.99/mo
          </button>
          <button className="mp-press" onClick={onClose} style={{ width: "100%", background: "none", border: "none", color: C.inkSoft, fontSize: 13, fontWeight: 600, padding: "6px 0" }}>
            Not now
          </button>
        </Glass>
      </div>
    </div>
  );
}

// perks/confirmation screen shown before subscribing to Premium or Verified
// Dealer — surfaces what the plan unlocks before the user commits to it
const PLAN_INFO = {
  premium: {
    Icon: Crown,
    color: C.gold,
    tint: "rgba(201,138,11,0.14)",
    title: "Megaphone Premium",
    subtitle: "Post anytime and an ad-free board.",
    price: "$4.99/mo",
    gradient: "linear-gradient(135deg, #C98A0B, #FFD60A)",
    buttonTextColor: "#3A2900",
    perks: [
      "Post anytime — skip the 1-hour free cooldown",
      "No ads, ever",
      "Priority match alerts",
      "Keyword alerts across every show",
    ],
  },
  dealer: {
    Icon: BadgeCheck,
    color: C.purple,
    tint: "rgba(175,82,222,0.14)",
    title: "Verified Dealer",
    subtitle: "Stand out as a trusted seller at every show.",
    price: "$9.99/mo",
    gradient: `linear-gradient(135deg, ${C.purple}, #D48CF0)`,
    buttonTextColor: "white",
    perks: [
      "Verified checkmark badge next to your name",
      "Demand insights — see what collectors want at each show",
      "Keyword alerts across every show",
      "Extra trust and visibility with buyers",
    ],
  },
};

function PlanPerks({ kind, onClose, onProceed }) {
  const info = PLAN_INFO[kind];
  const { Icon } = info;
  return (
    <div
      style={{ position: "absolute", inset: 0, background: "rgba(28,28,30,0.35)", backdropFilter: "blur(4px)", display: "flex", alignItems: "flex-end", zIndex: 10, borderRadius: 28 }}
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%" }}>
        <Glass
          strong
          radius={0}
          style={{
            borderTopLeftRadius: 26,
            borderTopRightRadius: 26,
            borderBottom: "none",
            borderLeft: "none",
            borderRight: "none",
            padding: "10px 20px calc(28px + env(safe-area-inset-bottom))",
          }}
        >
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(60,60,67,0.25)", margin: "0 auto 16px" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: info.tint, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon size={20} color={info.color} />
              </div>
              <div>
                <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: "-0.01em" }}>{info.title}</div>
                <div style={{ fontSize: 12.5, color: C.inkSoft, marginTop: 1 }}>{info.subtitle}</div>
              </div>
            </div>
            <button className="mp-press" onClick={onClose} style={{ background: "rgba(120,120,128,0.16)", border: "none", borderRadius: 999, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <X size={15} color={C.inkSoft} />
            </button>
          </div>

          <div style={{ fontSize: 11.5, fontWeight: 700, color: C.inkSoft, textTransform: "uppercase", letterSpacing: "0.03em", margin: "18px 0 10px" }}>
            What you'll get
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
            {info.perks.map((p) => (
              <div key={p} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5 }}>
                <Check size={14} color={C.green} /> {p}
              </div>
            ))}
          </div>

          <button
            className="mp-press"
            onClick={onProceed}
            style={{
              width: "100%",
              background: info.gradient,
              color: info.buttonTextColor,
              border: "none",
              borderRadius: 14,
              padding: "14px",
              fontWeight: 700,
              fontSize: 15.5,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              boxShadow: `0 6px 18px ${kind === "premium" ? "rgba(201,138,11,0.35)" : "rgba(175,82,222,0.35)"}`,
              marginBottom: 8,
            }}
          >
            <Icon size={17} /> Proceed — {info.price}
          </button>
          <button className="mp-press" onClick={onClose} style={{ width: "100%", background: "none", border: "none", color: C.inkSoft, fontSize: 13, fontWeight: 600, padding: "6px 0" }}>
            Not now
          </button>
        </Glass>
      </div>
    </div>
  );
}
