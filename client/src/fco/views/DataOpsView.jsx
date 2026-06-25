import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API_BASE } from '../constants.js';
import { Button } from '../ui.jsx';
import * as I from '../Icons.jsx';

async function getStatus() {
  const r = await axios.get(`${API_BASE}/enrichment/status`);
  return r.data.data;
}

async function postAction(path, body = {}) {
  const r = await axios.post(`${API_BASE}${path}`, body);
  return r.data;
}

export default function DataOpsView() {
  const [status, setStatus] = useState(null);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState({});
  const [toast, setToast] = useState(null);
  const pollRef = useRef(null);

  async function loadAll() {
    try {
      const [s, m] = await Promise.all([
        getStatus(),
        axios.get(`${API_BASE}/players/meta`).then(r => r.data),
      ]);
      setStatus(s);
      setMeta(m);
    } catch {}
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    pollRef.current = setInterval(loadAll, 8000);
    return () => clearInterval(pollRef.current);
  }, []);

  function showToast(msg, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  async function run(key, path, body = {}) {
    setBusy(b => ({ ...b, [key]: true }));
    try {
      const res = await postAction(path, body);
      showToast(res.message || 'Đã bắt đầu');
      setTimeout(loadAll, 1500);
    } catch (e) {
      showToast(e.response?.data?.message || e.message, false);
    } finally {
      setBusy(b => ({ ...b, [key]: false }));
    }
  }

  const q = status?.quality || {};
  const totalPlayers = meta?.totalPlayers || 0;
  const totalEnriched = status?.totalEnriched || 0;
  const totalMatched = status?.totalMatched || 0;
  const missingDetail = q.missingDetail || 0;
  const enrichPct = totalPlayers ? Math.round((totalEnriched / totalPlayers) * 100) : 0;
  const lr = status?.latestRun;

  return (
    <div className="fco-ops">
      <div className="fco-ops-head">
        <div>
          <h2 className="fco-h2">Data Ops</h2>
          <p className="fco-sub">Pipeline hiện dùng: scrape seasons → discover theo mùa → hydrate detail. Ẩn các luồng cũ để tránh chạy nhầm.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="fco-adminbadge"><I.ShieldCheck size={13} />Admin only</span>
          <Button variant="ghost" size="sm" icon={I.Refresh} onClick={loadAll}>Làm mới</Button>
        </div>
      </div>

      {/* Stats tiles */}
      <div className="fco-tiles">
        <Tile label="Tổng cầu thủ" value={loading ? '…' : totalPlayers.toLocaleString()} />
        <Tile label="Enriched" value={loading ? '…' : totalEnriched.toLocaleString()} color="var(--accent)" />
        <Tile label="Đã khớp" value={loading ? '…' : totalMatched.toLocaleString()} color="#37a0ff" />
        <Tile label="Tỷ lệ enrich" value={loading ? '…' : `${enrichPct}%`} color={enrichPct > 80 ? 'var(--accent)' : enrichPct > 50 ? '#f5c84b' : '#ff6b6b'} />
        <Tile label="Thiếu detail" value={loading ? '…' : missingDetail.toLocaleString()} color={missingDetail > 0 ? '#ff8a3d' : 'var(--accent)'} />
        <Tile label="Thiếu ảnh" value={loading ? '…' : (q.missingImage || 0).toLocaleString()} color="#f5b942" />
        <Tile label="Chưa match" value={loading ? '…' : (q.unmatched || 0).toLocaleString()} />
      </div>

      {/* Latest job progress */}
      {lr && (
        <div className="fco-panel">
          <div className="fco-panel-head">
            <div className="fco-panel-title">Job gần nhất</div>
            <span className={`fco-job-state ${lr.status === 'running' ? 'processing' : lr.status === 'success' ? 'done' : 'queued'}`}>
              {lr.status}
            </span>
          </div>
          <div className="fco-panel-body">
            <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 10 }}>{lr.message}</div>
            {lr.status === 'running' && lr.requested > 0 && (
              <div className="fco-job-bar">
                <div className="fco-job-fill" style={{ width: `${Math.round(((lr.processed || 0) / lr.requested) * 100)}%` }} />
              </div>
            )}
            <div className="fco-job-stats">
              <span>Yêu cầu: <b>{lr.requested?.toLocaleString()}</b></span>
              <span>Hoàn thành: <b>{lr.processed?.toLocaleString() || 0}</b></span>
              <span>Lỗi: <b>{lr.failed || 0}</b></span>
              {lr.finishedAt && <span>Xong lúc: <b>{new Date(lr.finishedAt).toLocaleTimeString('vi')}</b></span>}
            </div>
          </div>
        </div>
      )}

      <div className="fco-ops-grid">
        <div className="fco-ops-col">
          <OpCard
            icon={I.Layers} iconColor="#f5c84b"
            title="1. Scrape Seasons — cập nhật mùa + sprite icon"
            sub="Lấy danh sách season VN trực tiếp từ form filter FIFAAddict và lưu metadata sprite để hiển thị đúng icon như IPRM, NO7, PRM, VB, VNL…"
            meta="Chạy khi FIFAAddict thêm mùa mới hoặc khi icon mùa bị fallback chữ. Không xóa dữ liệu cầu thủ."
            action={
              <Button variant="primary" size="lg" icon={I.Layers}
                loading={busy.scrapeSeasons || status?.scrapeSeasonsRunning}
                disabled={status?.discoverBySeasonRunning}
                onClick={() => run('scrapeSeasons', '/enrichment/fifaaddict/scrape-seasons', {
                  headless: true,
                })}>
                Scrape Seasons
              </Button>
            }
          />

          <OpCard
            icon={I.Refresh} iconColor="var(--accent)"
            title="2. Discover by Season — crawl danh sách cầu thủ"
            sub="Pipeline chính hiện tại: loop qua bảng season và phân trang bằng spos=ovr_0-{pos1val}, tránh lỗi lặp/skip từ page=N cũ."
            meta="Dùng sau khi scrape seasons. Default maxRoundsPerSeason 50, delay 500ms. Chỉ upsert PlayerEnrichment cơ bản."
            action={
              <Button variant="primary" size="lg" icon={I.Refresh}
                loading={busy.discoverBySeason || status?.discoverBySeasonRunning}
                disabled={status?.bulkDetailRunning || status?.scrapeSeasonsRunning}
                onClick={() => run('discoverBySeason', '/enrichment/fifaaddict/discover-by-season', {
                  maxRoundsPerSeason: 50,
                  delayMs: 500,
                })}>
                Discover by Season
              </Button>
            }
          />

          <OpCard
            icon={I.Database} iconColor="#9bd64b"
            title="3. Bulk Detail — hydrate stats còn thiếu"
            sub="Sau khi có danh sách cơ bản, fetch detail cho các record còn thiếu detailedStats/raw detail để có đủ 34 chỉ số, trait, workrate, chiều cao/cân nặng."
            meta="limit 0 nghĩa là không giới hạn. Job đang chạy thì chỉ theo dõi tiến độ, không bấm chạy thêm."
            action={
              <Button variant="secondary" size="lg" icon={I.Database}
                loading={busy.bulkDetail || status?.bulkDetailRunning}
                disabled={status?.discoverBySeasonRunning || status?.scrapeSeasonsRunning}
                onClick={() => run('bulkDetail', '/enrichment/fifaaddict/bulk-detail', {
                  batchSize: 50,
                  delayMs: 500,
                  limit: 0,
                })}>
                Bulk Detail
              </Button>
            }
          />

          <OpCard
            icon={I.Refresh} iconColor="#37a0ff"
            title="4. Backfill Club Career 500 — cập nhật lịch sử CLB"
            sub="Force fetch lại detail cho 500 record đang thiếu clubCareer để lấy lịch sử khoác áo CLB từ FIFAAddict API."
            meta="Delay 600ms/request để giảm rủi ro bị rate-limit. Có thể bấm lại nhiều đợt."
            action={
              <Button variant="secondary" size="lg" icon={I.Refresh}
                loading={busy.clubCareer500 || status?.clubCareerBackfillRunning}
                disabled={status?.bulkDetailRunning || status?.discoverBySeasonRunning || status?.scrapeSeasonsRunning}
                onClick={() => run('clubCareer500', '/enrichment/fifaaddict/backfill-club-career', {
                  batchSize: 50,
                  delayMs: 600,
                  limit: 500,
                  onlyMissing: true,
                })}>
                Backfill 500
              </Button>
            }
          />

          <OpCard
            icon={I.Refresh} iconColor="#37a0ff"
            title="5. Backfill Club Career All Missing — cập nhật toàn bộ lịch sử CLB còn thiếu"
            sub="Force fetch lại detail cho toàn bộ record đang thiếu clubCareer. Job này có thể chạy rất lâu nếu còn nhiều record."
            meta="Chỉ dùng khi muốn để job chạy dài. Vẫn delay 600ms/request để giảm rủi ro bị rate-limit."
            action={
              <Button variant="secondary" size="lg" icon={I.Refresh}
                loading={busy.clubCareerAll || status?.clubCareerBackfillRunning}
                disabled={status?.bulkDetailRunning || status?.discoverBySeasonRunning || status?.scrapeSeasonsRunning}
                onClick={() => run('clubCareerAll', '/enrichment/fifaaddict/backfill-club-career', {
                  batchSize: 50,
                  delayMs: 600,
                  limit: 0,
                  onlyMissing: true,
                })}>
                Backfill All Missing
              </Button>
            }
          />
        </div>

        <div className="fco-ops-col">
          {/* Quality breakdown */}
          <div className="fco-panel">
            <div className="fco-panel-head"><div className="fco-panel-title">Chất lượng dữ liệu</div></div>
            <div className="fco-panel-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <QualityBar label="Đã enrichment" value={totalEnriched} total={totalPlayers} color="var(--accent)" />
                <QualityBar label="Đã khớp alias" value={totalMatched} total={totalEnriched} color="#37a0ff" />
                <QualityBar label="Có detail stats" value={totalEnriched - missingDetail} total={totalEnriched} color="#9bd64b" />
                <QualityBar label="Có ảnh" value={totalEnriched - (q.missingImage || 0)} total={totalEnriched} color="#f5b942" />
              </div>
              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <DataRow label="Tổng cầu thủ Nexon" value={totalPlayers.toLocaleString()} />
                <DataRow label="PlayerEnrichment records" value={totalEnriched.toLocaleString()} />
                <DataRow label="PlayerAlias matched" value={totalMatched.toLocaleString()} />
                <DataRow label="Thiếu detailedStats" value={missingDetail.toLocaleString()} />
                <DataRow label="Confidence thấp (<0.8)" value={(q.lowConfidence || 0).toLocaleString()} />
              </div>
            </div>
          </div>

          {/* Recent warnings */}
          {q.recentWarnings?.length > 0 && (
            <div className="fco-panel">
              <div className="fco-panel-head"><div className="fco-panel-title">Cảnh báo gần đây</div></div>
              <div className="fco-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {q.recentWarnings.slice(0, 5).map((w, i) => (
                  <div key={i} style={{ fontSize: 12, color: 'var(--text-dim)', borderBottom: '1px solid var(--border-soft)', paddingBottom: 6 }}>
                    <span style={{ color: 'var(--text)', fontWeight: 600 }}>{w.displayNameVi}</span>
                    {' — '}{w.parseWarnings?.join(', ')}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fco-toast" style={{ bottom: 60 }}>
          {toast.ok ? <I.Check size={16} style={{ color: 'var(--accent)' }} /> : <I.Alert size={16} style={{ color: '#ff8095' }} />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}

function Tile({ label, value, color }) {
  return (
    <div className="fco-tile">
      <div className="fco-tile-val" style={color ? { color } : {}}>{value}</div>
      <div className="fco-tile-lab">{label}</div>
    </div>
  );
}

function OpCard({ icon: Ico, iconColor, title, sub, meta, action }) {
  return (
    <div className="fco-op">
      <div className="fco-op-ico" style={{ color: iconColor, borderColor: iconColor + '33', background: iconColor + '12' }}>
        <Ico size={20} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="fco-op-title">{title}</div>
        <div className="fco-op-sub">{sub}</div>
        {meta && <div className="fco-op-meta"><I.Info size={12} />{meta}</div>}
      </div>
      {action}
    </div>
  );
}

function QualityBar({ label, value, total, color }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 5 }}>
        <span style={{ color: 'var(--text-dim)' }}>{label}</span>
        <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color }}>{pct}%</span>
      </div>
      <div style={{ height: 5, background: 'var(--surface-3)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 99, transition: 'width .5s ease' }} />
      </div>
    </div>
  );
}

function DataRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
      <span style={{ color: 'var(--text-dim)' }}>{label}</span>
      <span style={{ fontFamily: 'var(--mono)', fontWeight: 700 }}>{value}</span>
    </div>
  );
}
