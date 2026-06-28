# FIFAAddict Filter Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây dựng bộ lọc tìm kiếm cầu thủ trong DatabaseView giống với `#comp-foformsearch` trên vn.fifaaddict.com — bao gồm tìm tên, vị trí, mùa thẻ, giải đấu/quốc gia, chỉ số chi tiết, thể hình, lương, OVR và danh tiếng.

**Architecture:** `PlayerSearchForm` được tách thành component panel collapsible hai cột — hàng trên chứa search + nút, dưới là các filter group xếp theo block. `DatabaseView` giữ toàn bộ state filter và truyền props xuống form. State mới (league, nation, workRate, weakFoot, skillMoves, height, weight, reputation, statRanges) được thêm vào `DatabaseView` và serialized ra URL query string. API call đã hỗ trợ đầy đủ các tham số này ở backend.

**Tech Stack:** React 18, CSS Variables (dark theme hiện tại), fco.css, ui.jsx primitives, api.js (đã có tham số league/nation/workRate/weakFoot/skillMoves), player.controller.js (đã có xử lý height/weight/reputation/statRanges từ minPace..maxPhysical).

## Global Constraints

- Không thêm thư viện mới — chỉ dùng React + CSS thuần
- Tất cả label hiển thị bằng tiếng Việt (theo phong cách fifaaddict VN)
- Giữ dark theme hiện tại: `--bg`, `--surface`, `--surface-2`, `--accent`, `--border`
- Font: `Be Vietnam Pro` cho text, `JetBrains Mono` cho số
- Mobile-first: filter panel stack dọc trên nhỏ, 2 cột trên desktop
- Không bổ sung comment thừa vào code

---

## Phân tích so sánh: Hiện tại vs FIFAAddict

| Filter | FIFAAddict | fco-hub hiện tại | Action |
|--------|-----------|------------------|--------|
| Tìm tên | ✅ | ✅ | Giữ nguyên |
| Vị trí (toggle buttons) | ✅ 16 pos | ✅ | Cải thiện UI |
| Mùa thẻ (season chips) | ✅ | ✅ | Giữ nguyên |
| Giải đấu (dropdown) | ✅ | ❌ | **Thêm mới** |
| Câu lạc bộ (text search) | ✅ | ❌ | **Thêm mới** |
| Châu lục (dropdown) | ✅ | ❌ | Bỏ qua (data không có) |
| Quốc gia (dropdown + text) | ✅ | ❌ | **Thêm mới** |
| Chỉ số chi tiết (stat + range) | ✅ | ❌ | **Thêm mới** |
| OVR range | ❌ explicit / ✅ | ✅ | Giữ nguyên |
| Thể hình (Height, Weight) | ✅ | ❌ | **Thêm mới** |
| Tuổi / Birth Year | ✅ | ❌ | Bỏ qua (data thiếu) |
| Danh tiếng | ✅ | ❌ | **Thêm mới** |
| Lương range | ✅ | ✅ (max only) | Giữ nguyên |
| Chân thuận / Chân nghịch | ✅ | ❌ | **Thêm mới** |
| Kỹ năng (skill moves) | ✅ | ❌ | **Thêm mới** |
| Work rate | ✅ | ❌ | **Thêm mới** |

---

## File Structure

```
client/src/fco/
  components/
    PlayerSearchForm.jsx        ← REWRITE toàn bộ
    filter/
      PositionGrid.jsx          ← NEW: toggle button grid vị trí
      StatRangeFilter.jsx       ← NEW: dropdown stat + min/max spinners
      BodyFilter.jsx            ← NEW: height/weight/reputation ranges
      FootWorkFilter.jsx        ← NEW: foot + weakFoot + skillMoves + workRate
  views/
    DatabaseView.jsx            ← MODIFY: thêm state mới, thêm vào URL/API call
  api.js                        ← MODIFY: thêm tham số mới vào fetchPlayers
  fco.css                       ← MODIFY: thêm styles cho filter mới
```

---

### Task 1: Thêm state filter mới vào DatabaseView và api.js

**Files:**
- Modify: `client/src/fco/views/DatabaseView.jsx`
- Modify: `client/src/fco/api.js`

**Interfaces:**
- Produces: các state mới và setters được truyền xuống `PlayerSearchForm` qua props
  ```js
  // State variables added to DatabaseView:
  const [league, setLeague] = useState('');
  const [nation, setNation] = useState('');
  const [clubSearch, setClubSearch] = useState('');
  const [preferredFoot, setPreferredFoot] = useState('');
  const [weakFoot, setWeakFoot] = useState('');
  const [skillMoves, setSkillMoves] = useState('');
  const [workRateAttack, setWorkRateAttack] = useState('');
  const [workRateDefense, setWorkRateDefense] = useState('');
  const [heightMin, setHeightMin] = useState('');
  const [heightMax, setHeightMax] = useState('');
  const [weightMin, setWeightMin] = useState('');
  const [weightMax, setWeightMax] = useState('');
  const [reputation, setReputation] = useState('');
  const [statFilter, setStatFilter] = useState(''); // stat key e.g. 'pace'
  const [statMin, setStatMin] = useState('');
  const [statMax, setStatMax] = useState('');
  ```

- [ ] **Step 1: Thêm state mới vào DatabaseView**

  Mở `client/src/fco/views/DatabaseView.jsx`. Tìm block khai báo state (sau các `const [search, setSearch]`, `const [posGroups, setPosGroups]`...) và thêm vào ngay dưới `const [priceMax, setPriceMax]`:

  ```js
  const [league, setLeague] = useState('');
  const [nation, setNation] = useState('');
  const [clubSearch, setClubSearch] = useState('');
  const [preferredFoot, setPreferredFoot] = useState('');
  const [weakFoot, setWeakFoot] = useState('');
  const [skillMoves, setSkillMoves] = useState('');
  const [workRateAttack, setWorkRateAttack] = useState('');
  const [workRateDefense, setWorkRateDefense] = useState('');
  const [heightMin, setHeightMin] = useState('');
  const [heightMax, setHeightMax] = useState('');
  const [weightMin, setWeightMin] = useState('');
  const [weightMax, setWeightMax] = useState('');
  const [reputation, setReputation] = useState('');
  const [statFilter, setStatFilter] = useState('');
  const [statMin, setStatMin] = useState('');
  const [statMax, setStatMax] = useState('');
  ```

- [ ] **Step 2: Cập nhật hàm `readQS` để đọc params mới từ URL**

  Trong `DatabaseView.jsx`, tìm hàm `readQS(p)` và thêm các trường mới vào return object:

  ```js
  // Thêm vào return của readQS:
  league: p.get('league') || '',
  nation: p.get('nation') || '',
  clubSearch: p.get('club') || '',
  preferredFoot: p.get('foot') || '',
  weakFoot: p.get('wf') || '',
  skillMoves: p.get('sm') || '',
  workRateAttack: p.get('wra') || '',
  workRateDefense: p.get('wrd') || '',
  heightMin: p.get('hMin') || '',
  heightMax: p.get('hMax') || '',
  weightMin: p.get('wtMin') || '',
  weightMax: p.get('wtMax') || '',
  reputation: p.get('rep') || '',
  statFilter: p.get('stat') || '',
  statMin: p.get('statMin') || '',
  statMax: p.get('statMax') || '',
  ```

  Và tìm hàm `filtersToQS(f)` thêm các set tương ứng:

  ```js
  if (f.league) p.set('league', f.league);
  if (f.nation) p.set('nation', f.nation);
  if (f.clubSearch) p.set('club', f.clubSearch);
  if (f.preferredFoot) p.set('foot', f.preferredFoot);
  if (f.weakFoot) p.set('wf', f.weakFoot);
  if (f.skillMoves) p.set('sm', f.skillMoves);
  if (f.workRateAttack) p.set('wra', f.workRateAttack);
  if (f.workRateDefense) p.set('wrd', f.workRateDefense);
  if (f.heightMin) p.set('hMin', f.heightMin);
  if (f.heightMax) p.set('hMax', f.heightMax);
  if (f.weightMin) p.set('wtMin', f.weightMin);
  if (f.weightMax) p.set('wtMax', f.weightMax);
  if (f.reputation) p.set('rep', f.reputation);
  if (f.statFilter) p.set('stat', f.statFilter);
  if (f.statMin) p.set('statMin', f.statMin);
  if (f.statMax) p.set('statMax', f.statMax);
  ```

- [ ] **Step 3: Cập nhật useEffect URL sync và hàm `load`**

  Trong `useEffect` theo dõi filter để writeQS và trong dependency array của `load`, thêm tất cả state mới:

  ```js
  // useEffect writeQS:
  useEffect(() => {
    writeQS(filtersToQS({
      search, posGroups, seasons, ovr, salaryMax, priceMax,
      league, nation, clubSearch, preferredFoot, weakFoot, skillMoves,
      workRateAttack, workRateDefense, heightMin, heightMax,
      weightMin, weightMax, reputation, statFilter, statMin, statMax,
      sort, page, pageSize,
    }));
  }, [search, posGroups, seasons, ovr, salaryMax, priceMax,
      league, nation, clubSearch, preferredFoot, weakFoot, skillMoves,
      workRateAttack, workRateDefense, heightMin, heightMax,
      weightMin, weightMax, reputation, statFilter, statMin, statMax,
      sort, page, pageSize]);

  // Trong load callback, truyền tất cả params mới vào fetchPlayers:
  const res = await fetchPlayers({
    search, posGroups, seasons, ovr, salaryMax, priceMax,
    league, nation, clubSearch, preferredFoot, weakFoot, skillMoves,
    workRateAttack, workRateDefense, heightMin, heightMax,
    weightMin, weightMax, reputation, statFilter, statMin, statMax,
    sort, page, pageSize,
  });
  ```

  Cập nhật dependency array của `useCallback` cho `load` tương tự.

- [ ] **Step 4: Cập nhật `resetFilters`**

  ```js
  function resetFilters() {
    setSearch('');
    setPosGroups([]);
    setSeasons([]);
    setOvr(DEFAULT_OVR);
    setSalaryMax(DEFAULT_SALARY);
    setPriceMax(DEFAULT_PRICE);
    setLeague('');
    setNation('');
    setClubSearch('');
    setPreferredFoot('');
    setWeakFoot('');
    setSkillMoves('');
    setWorkRateAttack('');
    setWorkRateDefense('');
    setHeightMin('');
    setHeightMax('');
    setWeightMin('');
    setWeightMax('');
    setReputation('');
    setStatFilter('');
    setStatMin('');
    setStatMax('');
    setSort(DEFAULT_SORT);
    setPage(1);
  }
  ```

- [ ] **Step 5: Cập nhật `api.js` — `fetchPlayers` để truyền params mới tới backend**

  Mở `client/src/fco/api.js`. Destructure thêm từ params và build query:

  ```js
  // Thêm vào destructuring:
  const { search, posGroups, seasons, ovr, salaryMax, priceMax,
    league, nation, clubSearch, preferredFoot, weakFoot, skillMoves,
    workRateAttack, workRateDefense, heightMin, heightMax,
    weightMin, weightMax, reputation, statFilter, statMin, statMax,
    traits, sort, page, pageSize } = params;

  // Thêm vào block build query q:
  if (league) q.league = league;
  if (nation) q.nation = nation;
  if (clubSearch) q.club = clubSearch;  // backend cần filter theo club
  if (preferredFoot) q.preferredFoot = preferredFoot;
  if (weakFoot) q.weakFoot = weakFoot;
  if (skillMoves) q.skillMoves = skillMoves;
  if (workRateAttack) q.workRateAttack = workRateAttack;
  if (workRateDefense) q.workRateDefense = workRateDefense;
  if (heightMin) q.minHeight = heightMin;
  if (heightMax) q.maxHeight = heightMax;
  if (weightMin) q.minWeight = weightMin;
  if (weightMax) q.maxWeight = weightMax;
  if (reputation) q.reputation = reputation;
  if (statFilter && statMin) q[`min${statFilter.charAt(0).toUpperCase() + statFilter.slice(1)}`] = statMin;
  if (statFilter && statMax) q[`max${statFilter.charAt(0).toUpperCase() + statFilter.slice(1)}`] = statMax;
  ```

- [ ] **Step 6: Thêm backend filter club và height/weight vào player.controller.js**

  Mở `server/src/controllers/player.controller.js`. Trong hàm `getPlayers`, sau block `if (filters.league)`, thêm:

  ```js
  if (filters.club) enrichmentQuery.club = { $regex: filters.club, $options: 'i' };
  if (filters.reputation) enrichmentQuery.reputation = filters.reputation;
  ```

  Backend đã có `addNumberRange` cho height/weight thông qua `minHeight`/`maxHeight`/`minWeight`/`maxWeight`. Kiểm tra xem các trường này đã được khai báo trong destructuring của `req.query` chưa — nếu chưa thêm vào:

  ```js
  const { minHeight, maxHeight, minWeight, maxWeight, reputation, club } = req.query;
  // ...
  addNumberRange(enrichmentQuery, 'height', minHeight, maxHeight);
  addNumberRange(enrichmentQuery, 'weight', minWeight, maxWeight);
  ```

- [ ] **Step 7: Commit**

  ```bash
  rtk git add client/src/fco/views/DatabaseView.jsx client/src/fco/api.js server/src/controllers/player.controller.js
  rtk git commit -m "feat: add extended filter state and API params (league, nation, foot, height, weight, stat range)"
  ```

---

### Task 2: Tạo component PositionGrid

**Files:**
- Create: `client/src/fco/components/filter/PositionGrid.jsx`

**Interfaces:**
- Consumes: `positions: string[]`, `setPositions: (string[]) => void`
- Produces: Grid 4 nhóm (GK/DEF/MID/FWD) với toggle buttons cho từng vị trí

- [ ] **Step 1: Tạo file `PositionGrid.jsx`**

  ```jsx
  // client/src/fco/components/filter/PositionGrid.jsx
  const POSITION_GROUPS = {
    GK:  ['GK'],
    DEF: ['CB', 'LB', 'RB', 'LWB', 'RWB'],
    MID: ['CDM', 'CM', 'CAM', 'LM', 'RM'],
    FWD: ['ST', 'CF', 'LW', 'RW'],
  };

  export default function PositionGrid({ positions = [], setPositions }) {
    function toggle(pos) {
      setPositions(positions.includes(pos)
        ? positions.filter(p => p !== pos)
        : [...positions, pos]
      );
    }

    function toggleGroup(group) {
      const subs = POSITION_GROUPS[group];
      const allOn = subs.every(p => positions.includes(p));
      if (allOn) {
        setPositions(positions.filter(p => !subs.includes(p)));
      } else {
        setPositions([...new Set([...positions, ...subs])]);
      }
    }

    return (
      <div className="fa-pos-grid">
        {Object.entries(POSITION_GROUPS).map(([group, subs]) => (
          <div key={group} className="fa-pos-group">
            <button
              type="button"
              className={`fa-pos-group-label${subs.every(p => positions.includes(p)) ? ' on' : ''}`}
              onClick={() => toggleGroup(group)}
            >
              {group}
            </button>
            <div className="fa-pos-subs">
              {subs.map(pos => (
                <button
                  key={pos}
                  type="button"
                  className={`fa-pos-btn${positions.includes(pos) ? ' on' : ''}`}
                  onClick={() => toggle(pos)}
                >
                  {pos}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  rtk git add client/src/fco/components/filter/PositionGrid.jsx
  rtk git commit -m "feat: add PositionGrid filter component with group toggle"
  ```

---

### Task 3: Tạo component StatRangeFilter

**Files:**
- Create: `client/src/fco/components/filter/StatRangeFilter.jsx`

**Interfaces:**
- Consumes:
  ```js
  statFilter: string    // key như 'pace', 'shooting', 'dribbling', v.v.
  statMin: string
  statMax: string
  setStatFilter: (string) => void
  setStatMin: (string) => void
  setStatMax: (string) => void
  ```
- Produces: Một dropdown chọn chỉ số + 2 spinbutton min/max

- [ ] **Step 1: Tạo file `StatRangeFilter.jsx`**

  Danh sách stats lấy từ fifaaddict: pace, shooting, passing, dribbling, defending, physical, và các chỉ số phụ.

  ```jsx
  // client/src/fco/components/filter/StatRangeFilter.jsx
  const STAT_OPTIONS = [
    { value: '', label: '▾ Chỉ số' },
    { value: 'pace', label: 'Tốc độ' },
    { value: 'shooting', label: 'Dứt điểm' },
    { value: 'passing', label: 'Chuyền' },
    { value: 'dribbling', label: 'Rê bóng' },
    { value: 'defending', label: 'Phòng thủ' },
    { value: 'physical', label: 'Thể lực' },
  ];

  export default function StatRangeFilter({ statFilter, statMin, statMax, setStatFilter, setStatMin, setStatMax }) {
    return (
      <div className="fa-stat-range">
        <select
          className="fa-select"
          value={statFilter}
          onChange={e => { setStatFilter(e.target.value); setStatMin(''); setStatMax(''); }}
        >
          {STAT_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <div className="fa-range-inputs">
          <input
            type="number" className="fa-spin" placeholder="Min" min={0} max={99}
            value={statMin} disabled={!statFilter}
            onChange={e => setStatMin(e.target.value)}
          />
          <span className="fa-range-sep">–</span>
          <input
            type="number" className="fa-spin" placeholder="Max" min={0} max={99}
            value={statMax} disabled={!statFilter}
            onChange={e => setStatMax(e.target.value)}
          />
        </div>
      </div>
    );
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  rtk git add client/src/fco/components/filter/StatRangeFilter.jsx
  rtk git commit -m "feat: add StatRangeFilter component (stat dropdown + min/max)"
  ```

---

### Task 4: Tạo component FootWorkFilter

**Files:**
- Create: `client/src/fco/components/filter/FootWorkFilter.jsx`

**Interfaces:**
- Consumes:
  ```js
  preferredFoot: string    // 'right' | 'left' | ''
  weakFoot: string         // '1' – '5' (min rating)
  skillMoves: string       // '1' – '5' (min rating)
  workRateAttack: string   // 'Low' | 'Medium' | 'High' | ''
  workRateDefense: string  // 'Low' | 'Medium' | 'High' | ''
  setPreferredFoot, setWeakFoot, setSkillMoves, setWorkRateAttack, setWorkRateDefense
  ```
- Produces: Row các dropdown/toggle cho chân thuận, chân nghịch, kỹ năng, work rate

- [ ] **Step 1: Tạo file `FootWorkFilter.jsx`**

  ```jsx
  // client/src/fco/components/filter/FootWorkFilter.jsx
  const FOOT_OPTIONS = [
    { value: '', label: '▾ Chân thuận' },
    { value: 'right', label: 'Chân phải' },
    { value: 'left', label: 'Chân trái' },
  ];

  const STAR_OPTIONS = [
    { value: '', label: '▾ All' },
    { value: '5', label: '★★★★★' },
    { value: '4', label: '★★★★+' },
    { value: '3', label: '★★★+' },
    { value: '2', label: '★★+' },
    { value: '1', label: '★+' },
  ];

  const WR_OPTIONS = [
    { value: '', label: '▾ All' },
    { value: 'High', label: 'Cao' },
    { value: 'Medium', label: 'Trung bình' },
    { value: 'Low', label: 'Thấp' },
  ];

  export default function FootWorkFilter({
    preferredFoot, weakFoot, skillMoves,
    workRateAttack, workRateDefense,
    setPreferredFoot, setWeakFoot, setSkillMoves,
    setWorkRateAttack, setWorkRateDefense,
  }) {
    return (
      <div className="fa-foot-work-row">
        <div className="fa-filter-group">
          <label className="fa-filter-label">Chân thuận</label>
          <select className="fa-select" value={preferredFoot} onChange={e => setPreferredFoot(e.target.value)}>
            {FOOT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="fa-filter-group">
          <label className="fa-filter-label">Chân nghịch</label>
          <select className="fa-select" value={weakFoot} onChange={e => setWeakFoot(e.target.value)}>
            {STAR_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="fa-filter-group">
          <label className="fa-filter-label">Kỹ năng</label>
          <select className="fa-select" value={skillMoves} onChange={e => setSkillMoves(e.target.value)}>
            {STAR_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="fa-filter-group">
          <label className="fa-filter-label">WR Tấn công</label>
          <select className="fa-select" value={workRateAttack} onChange={e => setWorkRateAttack(e.target.value)}>
            {WR_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="fa-filter-group">
          <label className="fa-filter-label">WR Phòng thủ</label>
          <select className="fa-select" value={workRateDefense} onChange={e => setWorkRateDefense(e.target.value)}>
            {WR_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>
    );
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  rtk git add client/src/fco/components/filter/FootWorkFilter.jsx
  rtk git commit -m "feat: add FootWorkFilter component (foot, weakFoot, skillMoves, workRate)"
  ```

---

### Task 5: Tạo component BodyFilter (Height, Weight, Reputation, OVR, Salary)

**Files:**
- Create: `client/src/fco/components/filter/BodyFilter.jsx`

**Interfaces:**
- Consumes:
  ```js
  heightMin: string, heightMax: string
  weightMin: string, weightMax: string
  ovrMin: number, ovrMax: number
  salaryMax: number
  reputation: string
  setHeightMin, setHeightMax, setWeightMin, setWeightMax
  setOvr: ([min, max]) => void
  setSalaryMax: (number) => void
  setReputation: (string) => void
  ```
- Produces: Grid 3 cột các range input cho body metrics

- [ ] **Step 1: Tạo file `BodyFilter.jsx`**

  ```jsx
  // client/src/fco/components/filter/BodyFilter.jsx
  const REPUTATION_OPTIONS = [
    { value: '', label: '▾ all' },
    { value: 'Regular Player', label: 'Regular Player' },
    { value: 'Famous Player', label: 'Famous Player' },
    { value: 'Top Class', label: 'Top Class' },
    { value: 'World Class', label: 'World Class' },
    { value: 'Legendary', label: 'Legendary' },
  ];

  export default function BodyFilter({
    heightMin, heightMax, setHeightMin, setHeightMax,
    weightMin, weightMax, setWeightMin, setWeightMax,
    ovrMin, ovrMax, setOvr,
    salaryMax, setSalaryMax,
    reputation, setReputation,
  }) {
    return (
      <div className="fa-body-filter-grid">
        <div className="fa-filter-group">
          <label className="fa-filter-label">OVR</label>
          <div className="fa-range-inputs">
            <input type="number" className="fa-spin" placeholder="50" min={50} max={150}
              value={ovrMin === 50 ? '' : ovrMin}
              onChange={e => setOvr([Number(e.target.value) || 50, ovrMax])} />
            <span className="fa-range-sep">–</span>
            <input type="number" className="fa-spin" placeholder="150" min={50} max={150}
              value={ovrMax === 150 ? '' : ovrMax}
              onChange={e => setOvr([ovrMin, Number(e.target.value) || 150])} />
          </div>
        </div>
        <div className="fa-filter-group">
          <label className="fa-filter-label">Chiều cao (cm)</label>
          <div className="fa-range-inputs">
            <input type="number" className="fa-spin" placeholder="Min" min={140} max={210}
              value={heightMin} onChange={e => setHeightMin(e.target.value)} />
            <span className="fa-range-sep">–</span>
            <input type="number" className="fa-spin" placeholder="Max" min={140} max={210}
              value={heightMax} onChange={e => setHeightMax(e.target.value)} />
          </div>
        </div>
        <div className="fa-filter-group">
          <label className="fa-filter-label">Cân nặng (kg)</label>
          <div className="fa-range-inputs">
            <input type="number" className="fa-spin" placeholder="Min" min={50} max={120}
              value={weightMin} onChange={e => setWeightMin(e.target.value)} />
            <span className="fa-range-sep">–</span>
            <input type="number" className="fa-spin" placeholder="Max" min={50} max={120}
              value={weightMax} onChange={e => setWeightMax(e.target.value)} />
          </div>
        </div>
        <div className="fa-filter-group">
          <label className="fa-filter-label">Lương (triệu)</label>
          <div className="fa-range-inputs">
            <input type="number" className="fa-spin" placeholder="Max" min={1} max={50}
              value={salaryMax === 999999 ? '' : salaryMax}
              onChange={e => setSalaryMax(Number(e.target.value) || 999999)} />
          </div>
        </div>
        <div className="fa-filter-group">
          <label className="fa-filter-label">Danh tiếng</label>
          <select className="fa-select" value={reputation} onChange={e => setReputation(e.target.value)}>
            {REPUTATION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>
    );
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  rtk git add client/src/fco/components/filter/BodyFilter.jsx
  rtk git commit -m "feat: add BodyFilter component (height, weight, OVR, salary, reputation)"
  ```

---

### Task 6: Rewrite PlayerSearchForm — Tích hợp tất cả sub-components

**Files:**
- Modify: `client/src/fco/components/PlayerSearchForm.jsx`

**Interfaces:**
- Consumes: tất cả state và setters từ DatabaseView (xem props list đầy đủ bên dưới)
- Produces: Panel filter có thể collapse, hiển thị "MORE/LESS" giống fifaaddict

- [ ] **Step 1: Rewrite `PlayerSearchForm.jsx`**

  ```jsx
  // client/src/fco/components/PlayerSearchForm.jsx
  import { useState } from 'react';
  import * as I from '../Icons.jsx';
  import PositionGrid from './filter/PositionGrid.jsx';
  import StatRangeFilter from './filter/StatRangeFilter.jsx';
  import FootWorkFilter from './filter/FootWorkFilter.jsx';
  import BodyFilter from './filter/BodyFilter.jsx';

  const LEAGUE_OPTIONS = [
    { value: '', label: '▾ Giải đấu' },
    { value: 'England Premier League', label: 'England Premier League' },
    { value: 'England Championship', label: '+ England Championship' },
    { value: 'France Ligue 1', label: 'France Ligue 1' },
    { value: 'France Ligue 2', label: '+ France Ligue 2' },
    { value: 'Germany Bundesliga', label: 'Germany Bundesliga' },
    { value: 'Germany 2. Bundesliga', label: '+ Germany 2. Bundesliga' },
    { value: 'Italy Serie A', label: 'Italy Serie A' },
    { value: 'Italy Serie B', label: '+ Italy Serie B' },
    { value: 'Spain Primera Division', label: 'Spain Primera Division' },
    { value: 'Netherlands Eredivisie', label: 'Netherlands Eredivisie' },
    { value: 'Portugal Primeira Liga', label: 'Portugal Primeira Liga' },
    { value: 'United States Major League Soccer', label: 'MLS' },
    { value: 'Korea Republic K League 1', label: 'Korea K League 1' },
    { value: 'China PR Super League', label: 'China Super League' },
    { value: 'National Team', label: 'National Team' },
    { value: 'Rest of World', label: 'Rest of World' },
  ];

  export default function PlayerSearchForm({
    search = '', setSearch,
    positions = [], setPositions,
    ovr = [50, 150], setOvr,
    salaryMax = 999999, setSalaryMax,
    league = '', setLeague,
    nation = '', setNation,
    clubSearch = '', setClubSearch,
    preferredFoot = '', setPreferredFoot,
    weakFoot = '', setWeakFoot,
    skillMoves = '', setSkillMoves,
    workRateAttack = '', setWorkRateAttack,
    workRateDefense = '', setWorkRateDefense,
    heightMin = '', setHeightMin,
    heightMax = '', setHeightMax,
    weightMin = '', setWeightMin,
    weightMax = '', setWeightMax,
    reputation = '', setReputation,
    statFilter = '', setStatFilter,
    statMin = '', setStatMin,
    statMax = '', setStatMax,
    onReset,
    onSearch,
  }) {
    const [expanded, setExpanded] = useState(false);

    return (
      <div className="fa-form-panel">
        {/* Row 1: Search + Search button + toggle */}
        <div className="fa-search-row">
          <div className="fa-search-input-wrap">
            <input
              type="search"
              placeholder="Messi, Ronaldo"
              maxLength="50"
              value={search}
              className="fa-search-input"
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && onSearch()}
            />
            {search && (
              <button type="button" className="fa-clear-btn" onClick={() => setSearch('')} title="Xoá">
                <I.X size={14} />
              </button>
            )}
          </div>
          <button type="button" className="fa-btn fa-btn-primary" onClick={onSearch}>
            Tìm
          </button>
          <button type="button" className="fa-btn fa-btn-ghost" onClick={onReset} title="Đặt lại">
            <I.Refresh size={14} />
          </button>
          <button
            type="button"
            className={`fa-btn fa-btn-ghost fa-expand-btn${expanded ? ' on' : ''}`}
            onClick={() => setExpanded(v => !v)}
          >
            {expanded ? 'LESS' : 'MORE'}
            {expanded ? <I.ChevronUp size={12} /> : <I.ChevronDown size={12} />}
          </button>
        </div>

        {/* Row 2: Position grid — always visible */}
        <PositionGrid positions={positions} setPositions={setPositions} />

        {/* Expanded section */}
        {expanded && (
          <div className="fa-expanded-filters">
            {/* League + Nation */}
            <div className="fa-filter-row">
              <div className="fa-filter-group">
                <label className="fa-filter-label">Giải đấu</label>
                <select className="fa-select" value={league} onChange={e => setLeague(e.target.value)}>
                  {LEAGUE_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div className="fa-filter-group">
                <label className="fa-filter-label">Quốc gia</label>
                <input
                  type="text"
                  className="fa-text-input"
                  placeholder="england, spain..."
                  value={nation}
                  onChange={e => setNation(e.target.value)}
                />
              </div>
              <div className="fa-filter-group">
                <label className="fa-filter-label">Câu lạc bộ</label>
                <input
                  type="text"
                  className="fa-text-input"
                  placeholder="manchester, real..."
                  value={clubSearch}
                  onChange={e => setClubSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Stat range */}
            <div className="fa-filter-row">
              <div className="fa-filter-group fa-filter-group--wide">
                <label className="fa-filter-label">Chỉ số</label>
                <StatRangeFilter
                  statFilter={statFilter} statMin={statMin} statMax={statMax}
                  setStatFilter={setStatFilter} setStatMin={setStatMin} setStatMax={setStatMax}
                />
              </div>
            </div>

            {/* Foot + WorkRate */}
            <FootWorkFilter
              preferredFoot={preferredFoot} weakFoot={weakFoot} skillMoves={skillMoves}
              workRateAttack={workRateAttack} workRateDefense={workRateDefense}
              setPreferredFoot={setPreferredFoot} setWeakFoot={setWeakFoot}
              setSkillMoves={setSkillMoves} setWorkRateAttack={setWorkRateAttack}
              setWorkRateDefense={setWorkRateDefense}
            />

            {/* Body + OVR + Reputation */}
            <BodyFilter
              heightMin={heightMin} heightMax={heightMax}
              weightMin={weightMin} weightMax={weightMax}
              ovrMin={ovr[0]} ovrMax={ovr[1]} setOvr={setOvr}
              salaryMax={salaryMax} setSalaryMax={setSalaryMax}
              reputation={reputation} setReputation={setReputation}
              setHeightMin={setHeightMin} setHeightMax={setHeightMax}
              setWeightMin={setWeightMin} setWeightMax={setWeightMax}
            />
          </div>
        )}
      </div>
    );
  }
  ```

- [ ] **Step 2: Cập nhật `DatabaseView.jsx` để truyền đủ props mới vào `<PlayerSearchForm>`**

  Tìm đoạn render `<PlayerSearchForm ...>` trong DatabaseView và thêm tất cả props mới:

  ```jsx
  <PlayerSearchForm
    search={search}
    setSearch={val => { setSearch(val); setPage(1); }}
    positions={posGroups}
    setPositions={val => { setPosGroups(val); setPage(1); }}
    ovr={ovr}
    setOvr={val => { setOvr(val); setPage(1); }}
    salaryMax={salaryMax}
    setSalaryMax={val => { setSalaryMax(val); setPage(1); }}
    league={league}
    setLeague={val => { setLeague(val); setPage(1); }}
    nation={nation}
    setNation={val => { setNation(val); setPage(1); }}
    clubSearch={clubSearch}
    setClubSearch={val => { setClubSearch(val); setPage(1); }}
    preferredFoot={preferredFoot}
    setPreferredFoot={val => { setPreferredFoot(val); setPage(1); }}
    weakFoot={weakFoot}
    setWeakFoot={val => { setWeakFoot(val); setPage(1); }}
    skillMoves={skillMoves}
    setSkillMoves={val => { setSkillMoves(val); setPage(1); }}
    workRateAttack={workRateAttack}
    setWorkRateAttack={val => { setWorkRateAttack(val); setPage(1); }}
    workRateDefense={workRateDefense}
    setWorkRateDefense={val => { setWorkRateDefense(val); setPage(1); }}
    heightMin={heightMin}
    setHeightMin={val => { setHeightMin(val); setPage(1); }}
    heightMax={heightMax}
    setHeightMax={val => { setHeightMax(val); setPage(1); }}
    weightMin={weightMin}
    setWeightMin={val => { setWeightMin(val); setPage(1); }}
    weightMax={weightMax}
    setWeightMax={val => { setWeightMax(val); setPage(1); }}
    reputation={reputation}
    setReputation={val => { setReputation(val); setPage(1); }}
    statFilter={statFilter}
    setStatFilter={val => { setStatFilter(val); setPage(1); }}
    statMin={statMin}
    setStatMin={val => { setStatMin(val); setPage(1); }}
    statMax={statMax}
    setStatMax={val => { setStatMax(val); setPage(1); }}
    onReset={resetFilters}
    onSearch={load}
  />
  ```

- [ ] **Step 3: Kiểm tra Icons.jsx có ChevronUp và ChevronDown chưa**

  ```bash
  rtk grep "ChevronUp\|ChevronDown" client/src/fco/Icons.jsx
  ```

  Nếu thiếu, thêm vào Icons.jsx:

  ```jsx
  export function ChevronUp({ size = 16, style }) {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={style}>
        <path d="M4 10L8 6L12 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
  }

  export function ChevronDown({ size = 16, style }) {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={style}>
        <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
  }
  ```

- [ ] **Step 4: Commit**

  ```bash
  rtk git add client/src/fco/components/PlayerSearchForm.jsx client/src/fco/views/DatabaseView.jsx client/src/fco/Icons.jsx
  rtk git commit -m "feat: rewrite PlayerSearchForm with expanded filter panel (league, nation, club, stat, foot, body)"
  ```

---

### Task 7: Thêm CSS cho filter mới vào fco.css

**Files:**
- Modify: `client/src/fco/fco.css`

**Interfaces:**
- Produces: Tất cả class mới dùng trong Task 2–6 có style phù hợp dark theme

- [ ] **Step 1: Thêm CSS block mới vào cuối fco.css**

  ```css
  /* ===== Filter Panel (fifaaddict-parity) ===== */
  .fa-form-panel {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--r);
    padding: 14px;
    margin-bottom: 12px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .fa-search-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .fa-search-input-wrap {
    flex: 1;
    position: relative;
  }

  .fa-search-input {
    width: 100%;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 8px 32px 8px 12px;
    color: var(--text);
    font-size: 13px;
    font-family: inherit;
    outline: none;
    transition: border-color .15s;
  }
  .fa-search-input:focus { border-color: var(--accent); }
  .fa-search-input::placeholder { color: var(--text-faint); }

  .fa-clear-btn {
    position: absolute;
    right: 8px; top: 50%; transform: translateY(-50%);
    background: none; border: none; color: var(--text-faint);
    cursor: pointer; padding: 2px; display: flex; align-items: center;
  }
  .fa-clear-btn:hover { color: var(--text); }

  .fa-btn {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 7px 14px;
    border-radius: 7px;
    font-size: 12px; font-weight: 700; font-family: inherit;
    cursor: pointer;
    border: 1px solid transparent;
    transition: background .14s, color .14s, border-color .14s;
    white-space: nowrap;
  }
  .fa-btn-primary {
    background: var(--accent); color: #04130d; border-color: var(--accent);
  }
  .fa-btn-primary:hover { filter: brightness(1.1); }
  .fa-btn-ghost {
    background: var(--surface-2); color: var(--text-dim); border-color: var(--border);
  }
  .fa-btn-ghost:hover { color: var(--text); background: var(--surface-3); }
  .fa-expand-btn { font-size: 11px; }
  .fa-expand-btn.on { color: var(--accent); border-color: var(--accent); }

  /* Position grid */
  .fa-pos-grid {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }
  .fa-pos-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .fa-pos-group-label {
    font-size: 10px; font-weight: 800; font-family: var(--mono);
    color: var(--text-faint);
    background: none; border: none; cursor: pointer;
    text-align: left; padding: 0 2px;
    letter-spacing: .06em;
    transition: color .13s;
  }
  .fa-pos-group-label.on,
  .fa-pos-group-label:hover { color: var(--accent); }
  .fa-pos-subs { display: flex; flex-wrap: wrap; gap: 4px; }
  .fa-pos-btn {
    padding: 4px 7px;
    border-radius: 5px;
    border: 1px solid var(--border);
    background: var(--surface-2);
    color: var(--text-faint);
    font-size: 11px; font-weight: 700; font-family: var(--mono);
    cursor: pointer;
    transition: background .12s, color .12s, border-color .12s;
  }
  .fa-pos-btn:hover { color: var(--text); border-color: var(--text-faint); }
  .fa-pos-btn.on {
    background: var(--accent);
    color: #04130d;
    border-color: var(--accent);
  }

  /* Expanded filters section */
  .fa-expanded-filters {
    display: flex;
    flex-direction: column;
    gap: 10px;
    border-top: 1px solid var(--border-soft);
    padding-top: 10px;
  }

  .fa-filter-row {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  .fa-filter-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 130px;
    flex: 1;
  }
  .fa-filter-group--wide { flex: 2; }

  .fa-filter-label {
    font-size: 10px; font-weight: 700;
    color: var(--text-faint);
    text-transform: uppercase;
    letter-spacing: .05em;
  }

  .fa-select {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 7px;
    padding: 7px 10px;
    color: var(--text);
    font-size: 12px; font-family: inherit;
    outline: none;
    cursor: pointer;
    transition: border-color .13s;
  }
  .fa-select:focus { border-color: var(--accent); }

  .fa-text-input {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 7px;
    padding: 7px 10px;
    color: var(--text);
    font-size: 12px; font-family: inherit;
    outline: none;
    transition: border-color .13s;
  }
  .fa-text-input:focus { border-color: var(--accent); }
  .fa-text-input::placeholder { color: var(--text-faint); }

  .fa-spin {
    width: 64px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 7px;
    padding: 6px 8px;
    color: var(--text);
    font-size: 12px; font-family: var(--mono); font-weight: 600;
    outline: none;
    transition: border-color .13s;
    -moz-appearance: textfield;
  }
  .fa-spin::-webkit-outer-spin-button,
  .fa-spin::-webkit-inner-spin-button { -webkit-appearance: none; }
  .fa-spin:focus { border-color: var(--accent); }
  .fa-spin:disabled { opacity: .38; cursor: not-allowed; }

  .fa-range-inputs {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .fa-range-sep {
    color: var(--text-faint);
    font-size: 12px;
    flex-shrink: 0;
  }

  /* Stat range filter */
  .fa-stat-range {
    display: flex;
    gap: 8px;
    align-items: flex-end;
    flex-wrap: wrap;
  }
  .fa-stat-range .fa-select { flex: 1; min-width: 130px; }

  /* Foot/Work rate row */
  .fa-foot-work-row {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }
  .fa-foot-work-row .fa-filter-group { min-width: 110px; }

  /* Body filter grid */
  .fa-body-filter-grid {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }
  .fa-body-filter-grid .fa-filter-group { min-width: 120px; }

  @media (max-width: 600px) {
    .fa-filter-row,
    .fa-foot-work-row,
    .fa-body-filter-grid { flex-direction: column; }
    .fa-pos-grid { gap: 8px; }
    .fa-spin { width: 54px; }
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  rtk git add client/src/fco/fco.css
  rtk git commit -m "style: add fifaaddict-parity filter panel CSS (dark theme)"
  ```

---

### Task 8: Kiểm tra trực quan và sửa lỗi

**Files:**
- Verify: toàn bộ filter hoạt động đúng end-to-end

- [ ] **Step 1: Khởi động dev server**

  ```bash
  cd D:/ReactJS/fco-hub && npm run dev
  ```
  Hoặc nếu là monorepo:
  ```bash
  cd D:/ReactJS/fco-hub/client && npm run dev
  ```

- [ ] **Step 2: Mở browser và kiểm tra DatabaseView**

  Dùng Playwright MCP hoặc mở `http://localhost:5173` (hoặc port khác). Kiểm tra:
  - Search box hoạt động, nhấn Enter → gọi API
  - Các position button toggle đúng màu (on = green accent)
  - Click "MORE" → mở phần expanded
  - Chọn giải đấu → URL update → số cầu thủ thay đổi
  - Nhập quốc gia text → filter đúng
  - Chọn stat + nhập min → API gửi đúng param
  - Dropdown foot/workRate → filter đúng
  - OVR range inputs → filter đúng
  - Click reset → tất cả về default

- [ ] **Step 3: Kiểm tra mobile layout (viewport 375px)**

  Resize browser về 375px wide và kiểm tra layout không bị vỡ.

- [ ] **Step 4: Sửa lỗi nếu có rồi commit final**

  ```bash
  rtk git add -A
  rtk git commit -m "fix: resolve filter panel UI issues from manual testing"
  ```

---

## Checklist tự review

- [x] **Spec coverage:** Tất cả filter chính của fifaaddict #comp-foformsearch đã có task tương ứng (league, nation, club, position, stat range, foot, weakFoot, skillMoves, workRate, height, weight, OVR, salary, reputation)
- [x] **Placeholder scan:** Tất cả steps có code thực tế, không có TBD/TODO
- [x] **Type consistency:** Props truyền từ DatabaseView sang các sub-components nhất quán theo tên đã định nghĩa trong Task 1
- [x] **Backend:** `club` filter cần thêm vào controller (Task 1 Step 6), các params còn lại đã có sẵn
- [x] **Icons:** ChevronUp/ChevronDown được kiểm tra và thêm nếu thiếu (Task 6 Step 3)
- [x] **URL state:** Tất cả state mới được serialize/deserialize qua query string
- [x] **Reset:** `resetFilters` reset đầy đủ tất cả state mới

---

*Các filter Châu lục, Tuổi/Birth Year, Jersey Number, Tông da bị bỏ qua do dữ liệu backend không hỗ trợ đầy đủ. Có thể thêm sau khi data được chuẩn hóa.*
