# FCO Squadmaker Clone — Feature Notes (theo fifaaddict.com/vn/fco-squadmaker)

> Tài liệu ghi chú tổng hợp, theo từng phần của trang gốc. Đây là notes/requirements, chưa phải plan thực thi cuối cùng — sẽ chuyển thành plan thực thi (superpowers:writing-plans) khi note đủ các phần.

Nguồn tham chiếu: https://fifaaddict.com/vn/fco-squadmaker/

## ⏸️ Việc bị hoãn — cần làm sau (đừng quên)
- [ ] **Migrate auth toàn hệ thống sang JWT (access + refresh token)** — áp dụng cho cả admin (thay `express-session` hiện tại trong `server/src/server.js`) và public user. Chi tiết đầy đủ ở Phần 5.1.
- [ ] **Đăng nhập Google/Facebook cho public user** (Passport.js lấy profile, cấp JWT giống admin) — model `User` mới, route `/api/auth/google`, `/api/auth/facebook`, `/api/auth/refresh`. Chi tiết ở Phần 5.1.
- [ ] **Lưu squad server-side + chia sẻ công khai** (model `SquadPlan`, API CRUD, trang `/vn/fco-squadmaker/plans` tương ứng) — phụ thuộc vào 2 mục trên đã xong. Chi tiết ở Phần 5.2, 5.3.
- Trong lúc chờ: Squad Builder hoạt động đầy đủ ở chế độ chỉ lưu **localStorage** (đã có sẵn qua `squadHelpers.js`), không cần các mục trên để hoàn thành phần Pitch/UI chính.

Cấu trúc trang gốc (tổng quan):
1. Thông tin lương / OVR trung bình / Team Color
2. Lựa chọn sơ đồ chiến thuật (formation select)
3. **Sân thi đấu trực quan (Pitch) — đang note**
4. Bộ lọc & tìm cầu thủ
5. Sơ đồ công khai cộng đồng
6. QL đội hình + Capture Squad + chia sẻ mạng xã hội
7. Footer

---

## Phần 1: Pitch (`#pitch`) — 11 Player Card + Drag & Drop + Formation

### Trạng thái hiện tại trong code (fco-hub)
- `client/src/fco/views/SquadView.jsx`: render pitch, 11 slot theo `getFormationSlots(formationId)`, xử lý click-to-place, move-mode (`movingSlotId`), và drag&drop hiện tại chỉ gọi `swapSquadSlots` (đổi chỗ 2 slot).
- `client/src/fco/squadHelpers.js`: định nghĩa `FORMATIONS` — hiện chỉ có **7 formation**: `4-2-3-1, 4-3-3, 4-4-2 (biến thể), 4-1-2-1-2, 3-4-3, 5-2-3` (cần đọc lại đúng danh sách, có thể thiếu).
- `client/src/fco/ui.jsx` → `PlayerCardMini`: card hiển thị `bg` theo season (`--fco-card-bg`), `ovr`, `pos` (theo slot), season chip, avatar, tên, badge `+level`. **Chưa có** field lương (`fc-salary`) và **chưa có** huy hiệu grade/enchant (`fc-grade enchant_8`).
- `client/src/fco/views/DetailView.jsx`: đã có sẵn `player.positionRatings` — mảng `{code, label, value, recommended}` chứa OVR theo từng vị trí khả dụng của cầu thủ (dùng ở `fa-position-row` trong trang detail). **Đây là nguồn dữ liệu dùng để tính OVR khi đặt cầu thủ lệch vị trí trên pitch.**

### Yêu cầu (đã chốt với user)

**1.1 Formation đầy đủ theo fifaaddict — cần bổ sung toàn bộ danh sách sau (39 formation):**
```
3-4-3, 3-4-3(2), 3-4-1-2, 3-2-3-2, 3-2-2-1-2, 3-1-2-1-3, 3-1-4-2,
4-5-1, 4-4-2, 4-4-2(2), 4-4-1-1, 4-3-3, 4-3-3(2),
4-3-2-1, 4-3-1-2, 4-2-4, 4-2-3-1, 4-2-2-2, 4-2-2-2(2), 4-2-2-1-1,
4-2-1-3, 4-2-1-3(2), 4-1-4-1, 4-1-3-2,
4-1-2-3, 4-1-2-3(2), 4-1-2-1-2, 4-1-2-1-2(2),
5-4-1, 5-3-2, 5-2-3, 5-2-1-2, 5-1-2-1-1
```
- Cần định nghĩa toạ độ (x%, y%) cho từng slot của từng formation (39 bộ). Các biến thể `(2)` là bố trí khác nhau của cùng số lượng vị trí (ví dụ lệch trái/phải, hoặc vai trò CM/CDM khác nhau) — cần xem kỹ trang gốc để lấy đúng vị trí từng biến thể, không tự đoán.
- TODO: cần chụp/kiểm tra từng formation trên fifaaddict để lấy toạ độ chính xác, hoặc test bằng mắt rồi tinh chỉnh.

**1.2 Drag & Drop — cho phép di chuyển tự do, không chỉ swap:**
- Kéo cầu thủ từ slot A → slot B **trống**: **move** — A trống lại, cầu thủ sang B.
- Kéo cầu thủ từ slot A → slot B **đã có cầu thủ khác**: **swap** hai cầu thủ (giữ hành vi hiện tại).
- Cần sửa `handleDrop` trong `SquadView.jsx` để phân biệt 2 case (hiện dùng chung `swapSquadSlots` cho mọi trường hợp — cần xác nhận lại nó có tự move đúng khi target rỗng hay không, rồi làm rõ code path).

**1.3 Tính lại chỉ số (OVR) theo vị trí đá thực tế trên pitch:**
- Khi 1 cầu thủ được đặt vào slot có vị trí (`slot.pos`) khác với vị trí sở trường, OVR hiển thị trên card phải lấy từ `player.positionRatings` tương ứng với `slot.pos` (giống cách `DetailView.jsx` tra `ratingByLabel.get(pos)`), **không dùng `player.ovr` gốc**.
- Nếu `positionRatings` không có rating cho vị trí đó (cầu thủ không thể đá vị trí này / penalty quá nặng) → cần fallback: có thể vẫn hiển thị nhưng đánh dấu cảnh báo, hoặc dùng giá trị thấp nhất có sẵn — **cần hỏi lại user quyết định UX cho case này** khi đến lượt.
- Áp dụng: OVR hiển thị trên `PlayerCardMini` khi ở trong Pitch phải theo `slot.pos`, không phải `primaryPos`.

**1.4 Cộng chỉ số trực quan ngay trên thẻ khi đủ điều kiện Team Color:**
- Khi cầu thủ trên pitch thoả điều kiện của bất kỳ nhóm nào trong 3 loại Team Color (Phần 2.3) → chỉ số hiển thị trên `PlayerCardMini`/card trong pitch phải **cộng dồn ngay lập tức** (OVR + các chỉ số phụ liên quan), không phải chỉ hiện ở bảng tổng kết riêng.
- Cơ chế 2 chiều, đồng bộ dữ liệu:
  - **Trên card (pitch)**: OVR + stat hiển thị = giá trị gốc (đã tính theo vị trí, xem 1.3) + tổng bonus từ tất cả team color mà cầu thủ đó đang thoả. Đã có nền móng gần đúng: `applySquadBonus(player, bonus)` trong `teamColor.js` (cộng `upgradeBonus + teamColorBonus` vào `ovr` và 6 chỉ số phụ) — **nhưng cần mở rộng để cộng đúng theo cả 3 loại team color mới** (hiện chỉ có club-group + upgrade-tier, thiếu "season" trong loại 1 và toàn bộ loại 3 "liên kết").
  - **Trên `team-color-strip` (header, Phần 2.3)**: mỗi nhóm/bộ Team Color đang active phải hiển thị rõ **breakdown**: những chỉ số nào được cộng (OVR và/hoặc pace/shooting/passing/dribbling/defending/physical) và cộng thêm bao nhiêu — không chỉ hiện tên nhóm + số lượng cầu thủ như hiện tại (`fco-squad-panel-buff` hiện chỉ hiện `+{group.buff?.up}`, cần xác nhận `up` đã đúng là OVR hay là stat chung, và có cộng riêng cho từng loại stat không).
- Cần xác nhận công thức buff của cả 3 loại Team Color có tách riêng theo từng chỉ số (vd "CB +2 defending" khác "ST +2 shooting") hay chỉ cộng đồng loại (flat OVR như hiện tại) — đây phụ thuộc vào **data thật thu thập từ fifaaddict** (đã note ở Phần 2.3, việc thu thập sẽ làm sau khi note xong UI) — nếu buff thật có phân theo stat cụ thể theo từng loại tuyến (FW/MF/DF) thì `applySquadBonus` hiện tại (cộng đều 6 chỉ số) sẽ cần viết lại hoàn toàn.
- Card trên pitch nên có chỉ dấu trực quan (ví dụ icon nhỏ hoặc màu viền) cho biết cầu thủ đang được cộng bonus từ team color nào, đồng bộ với hành vi hover/click highlight đã note ở Phần 2.3/3.

**1.5 Search Modal khi bấm dấu `+` trên slot pitch (chọn cầu thủ):**
- fifaaddict: bấm dấu `+` → mở `search-modal` với **sidebar filter chi tiết bên trái** + list cầu thủ bên phải, **mặc định load sẵn top chỉ số theo đúng vị trí (`pos`) của slot đang chọn**.
- Trạng thái hiện tại (`client/src/fco/components/PlayerPicker.jsx`):
  - Đã có modal tìm kiếm cơ bản (`showTopPlayers` → mặc định load 10 cầu thủ top OVR theo `posGroups` khi chưa gõ gì) — **đã khớp một phần** với hành vi "default top chỉ số ở vị trí đang chọn sẵn" (xem `getPickerPosGroupsForSlot` trong `squadHelpers.js` truyền vào `posGroups`).
  - **Chưa có sidebar filter bên trái** — hiện chỉ có 1 ô search text (`fco-modal-search`) + danh sách kết quả, không có UI filter chi tiết.
  - ✅ Backend đã hỗ trợ rất nhiều filter sẵn qua `fetchPlayers()` (`client/src/fco/api.js:8-45`) nhưng **chưa được expose ra UI** của `PlayerPicker`: `seasons`, `ovr` (range), `salaryMax`, `priceMax`, `league`, `nation`, `careerClub`, `preferredFoot`, `weakFoot`, `skillMoves`, `workRateAttack`, `workRateDefense`, `heightMin/Max`, `weightMin/Max`, `reputation`, `statFilter + statMin/Max` (lọc theo 1 chỉ số cụ thể), `traits`.
  - → Việc cần làm: build sidebar filter trong `PlayerPicker` (hoặc component filter riêng) map đúng vào các param đã có sẵn ở backend — không cần thêm API mới, chỉ cần thêm UI.
- TODO cần hỏi thêm: sidebar filter trên fifaaddict có đúng khớp hết với danh sách filter backend đã hỗ trợ không, hay có filter nào backend chưa có (cần bổ sung API)? Cần xem kỹ giao diện thật của `search-modal` trên fifaaddict (tên từng filter, dạng input: dropdown/slider/checkbox) trước khi thiết kế UI.

**1.6 Danh sách kết quả bên phải trong Search Modal — hiển thị + tương tác:**
- Mỗi dòng kết quả cầu thủ cần hiển thị sẵn (không cần hover) các thông tin quan trọng: **chân thuận, chân không thuận (weak foot), kỹ thuật (skill moves)** — hiện `fco-modal-item` trong `PlayerPicker.jsx` (dòng 108-127) chỉ hiển thị avatar, tên, season chip, vị trí, OVR — **chưa có** preferredFoot/weakFoot/skillMoves hiển thị trực tiếp trên item.
- **Hover vào 1 kết quả** → hiển thị tooltip/popover tạm thời với thông tin chi tiết hơn: chỉ số chính (pace/shooting/passing/dribbling/defending/physical...) và **chỉ số ẩn** (traits/kỹ năng ẩn — giống `traitsDescription`/`traits` đã dùng ở trang detail, xem `DetailView.jsx` phần "Kỹ năng ẩn").
- **Click vào dấu `+`** (icon riêng, cạnh mỗi item) → thêm cầu thủ đó vào đúng slot đang chọn (giữ hành vi hiện tại của `choosePlayer()`, chỉ đổi từ click cả hàng sang click riêng nút `+`).
- **Click vào phần thông tin cầu thủ (avatar/tên)** → điều hướng sang trang detail (`/players/:id`) — hành vi mới, hiện `fco-modal-item` là 1 `<button>` duy nhất chỉ để chọn cầu thủ, cần tách UI thành 2 vùng bấm riêng biệt (click vùng info = đi trang detail mở tab mới hoặc điều hướng, click nút `+` = thêm vào slot) để không xung đột hành động.
- TODO cần hỏi: click vào cầu thủ để xem detail có mở tab mới không, hay điều hướng rời khỏi trang Squad (mất trạng thái đang build đội hình)? Nên ưu tiên mở tab mới để không mất tiến trình build squad.

**1.7 `player-edit-modal` — hover vào thẻ đã chọn để chỉnh riêng:**
- fifaaddict: hover vào 1 `player-card` đã có cầu thủ trên pitch → hiện nút **edit** ở góc trên-trái → mở `player-edit-modal` cho phép chỉnh **riêng thẻ đó**:
  - **Grade** — chỉnh grade riêng cho thẻ này (giống `GradeSelector`/`GRADE_OPTIONS` +1..+13 ở trang detail, xem Phần 4.4).
  - **Level** — chỉnh level riêng (giống `FlatBonusSelector` Lvl 1-5, xem Phần 4.2).
  - **Các mùa có của thẻ này (season variants)** — cho phép đổi sang phiên bản mùa giải khác của cùng cầu thủ đó mà không cần mở lại search-modal tìm từ đầu (tiết kiệm thời gian rất nhiều — đây là feature hay, cần làm đúng). Có thể tái sử dụng data `related` (danh sách "Các phiên bản khác" đã có sẵn ở trang detail — xem `DetailView.jsx` phần "related seasons") để liệt kê các mùa khác của cùng cầu thủ.
  - **Nút "Tìm lại"** — mở lại `search-modal` (Phần 1.5) để thay hẳn cầu thủ khác vào slot này (khác với đổi season, đây là thay cầu thủ hoàn toàn khác).
  - **Nút xoá cầu thủ khỏi slot đó**.
- So sánh với code hiện tại (`SquadView.jsx:238-271`):
  - Đã có: nút "Đổi vị trí" (swap, `IconButton I.ArrowUpDown`), nút "Xoá cầu thủ" (`I.X`), level stepper (+/- và `LevelSelect`) — nhưng **luôn hiển thị** (không phải hover-to-reveal), và **chưa có chỉnh Grade riêng theo thẻ**, **chưa có đổi season/phiên bản khác ngay tại slot**.
  - Cần đổi UX: gom các control lại thành 1 modal/popover xuất hiện khi hover (giống fifaaddict `player-edit-modal`), thay vì để rời rạc luôn hiện trên card như hiện tại. Cần xác nhận: có giữ luôn 2 nút nhỏ hiện tại (đổi vị trí, xoá nhanh) ngoài modal hay gộp hết vào modal edit khi hover?
  - "Đổi vị trí" (swap, hiện có) khác với "Tìm lại" (research, mới) — swap là đổi chỗ với slot khác trong đội hình hiện tại, tìm lại là thay bằng cầu thủ mới từ database. Cả 2 hành vi này giữ lại, không thay thế nhau.
- TODO cần hỏi: layout `player-edit-modal` cụ thể (modal nổi lên hay dropdown ngay cạnh thẻ), và control "Grade riêng theo thẻ" ở đây có phải chính là field `grade` dùng chung với `header-bulk-reinforce-btn` (Phần 4.4) hay là field độc lập khác.

**1.8 `desktop-rail` — cột phụ bên cạnh pitch (chỉ hiện ở desktop rộng):**
- Ẩn/hiện theo breakpoint. Đã kiểm tra layout hiện có: `.fco-main` (container chính) rộng tối đa **1320px** (`fco.css:111`), và breakpoint "desktop" hiện dùng nhất quán trong dự án là **1120px** (`.fco-hide-md` ẩn ở max-width 1120px, `fco-detail-grid`/`fco-ops-grid` đổi 1 cột ở dưới 1120px — xem `fco.css:1097`, `fco.css:1483`).
- → **Quyết định: dùng `min-width: 1121px` (khớp breakpoint 1120px đang có sẵn trong dự án) thay vì con số 1280px tuỳ tiện từ fifaaddict**, để `desktop-rail` ẩn/hiện đồng bộ với các layout 2-cột khác của trang (ví dụ `fco-detail-grid` ở trang detail cũng chuyển 1 cột dưới 1120px) — nhất quán trải nghiệm responsive toàn site thay vì tạo thêm 1 breakpoint riêng lẻ.
- Gồm 2 phần:
  1. Khu vực quảng cáo — tái sử dụng `MonetizationSlot` đã có sẵn trong dự án (`client/src/components/monetization/MonetizationSlot.jsx`, đã dùng ở `DetailView.jsx` với `placement="player_detail_sidebar"` và `VideosView.jsx`). **`SquadView.jsx` hiện chưa dùng `MonetizationSlot`** — cần thêm với `placement` mới phù hợp (ví dụ `squad_rail` hay tương tự, cần thống nhất tên placement).
  2. `desktop-rail__panel desktop-rail__roster` — bảng danh sách 11 vị trí đội hình dạng list (khác với dạng pitch trực quan):
     - `desktop-rail__roster-head`: tiêu đề bảng.
     - `desktop-rail__roster-list`: danh sách các dòng, mỗi dòng tương ứng 1 slot trong đội hình hiện tại (đồng bộ 1-1 với `slots` từ `getFormationSlots(formationId)` đã dùng trong `SquadView.jsx`).
       - `desktop-roster-slot--empty`: slot chưa có cầu thủ — có dấu `+`, bấm vào mở `search-modal` (Phần 1.5) đúng slot đó (dùng lại `handleSlotClick`/`setPickerSlotId` hiện có).
       - `desktop-roster-slot--filled`: slot đã có cầu thủ — hiển thị thông tin cầu thủ dạng compact (tên, OVR, vị trí...). Khi **hover**:
         - Hiện nút xoá cầu thủ khỏi slot (dùng lại `removeFromSlot`).
         - Có control chọn cấp nâng cấp (dùng lại `LevelSelect`/`stepLevel` hiện có).
         - Click vào dòng → đi tới trang chi tiết cầu thủ, **hoặc** mở modal chi tiết ngay tại chỗ (user gợi ý "làm modal cũng hay" — chưa chốt, cần quyết định UX: điều hướng trang mới vs modal). Có thể tái sử dụng ý tưởng modal ở Phần 1.7 (`player-edit-modal`) cho hành vi này, tránh tạo 2 modal khác nhau cho cùng mục đích edit — **cần xác nhận: đây có phải chính là cách khác để mở `player-edit-modal` (Phần 1.7), chỉ khác điểm truy cập (từ rail thay vì từ pitch card)?**
- **Đồng bộ 2 chiều bắt buộc với Pitch**: danh sách `desktop-rail__roster-list` phải phản ánh đúng theo thời gian thực khi:
  - Kéo-thả (drag & drop) cầu thủ trên pitch (Phần 1.2) → thứ tự/vị trí trong rail cập nhật theo.
  - Đổi `formationSelect` (Phần 1.1) → danh sách 11 dòng trong rail đổi theo vị trí mới của formation đó (số lượng slot theo từng tuyến có thể đổi, ví dụ đổi từ 4-3-3 sang 5-2-3 thì số CB tăng, số tiền vệ giảm).
  - → Rail và Pitch phải cùng dùng chung 1 nguồn state (`bySlotId`, `slots`) đã có trong `SquadView.jsx`, chỉ khác cách render (trực quan trên sân vs danh sách dạng bảng) — không phải 2 state riêng biệt cần đồng bộ thủ công.

### Còn thiếu / cần note tiếp ở phần 1 (chưa hỏi hết)
- `fc-salary`: cách tính & hiển thị lương trên card, liên kết với "Tổng lương" giới hạn 300 điểm (thuộc phần Header/Info — sẽ note khi tới phần đó).
- `fc-grade enchant_8`: huy hiệu/màu theo cấp nâng cấp (enchant level) — hiện `PlayerCardMini` chỉ có badge số `+level` dạng text, chưa có style theo tier như fifaaddict.
- Xác nhận cơ chế OVR trung bình đội cập nhật theo OVR-theo-vị-trí (không phải OVR gốc) khi tính tổng ở phần Header.

---

## Phần 2: `header-summary-inner` — 3 summary card

### 2.1 `summary-card--fp` (lương)
- Hiển thị tổng lương hiện tại của đội hình / lương tối đa.
- Cho phép **chọn lương tối đa theo yêu cầu** (giống 1 config/limit người dùng tự set, không cố định 300 — cần xác nhận range cho phép chọn).
- Khi tổng lương hiện tại > lương tối đa → thêm class `is-over-limit` (đổi màu cảnh báo).
- ✅ Data đã có sẵn: `player.salary` — xác nhận tại `client/src/fco/views/DetailView.jsx:519` (`fa-economy-row`, hiển thị `Lương <b>{p.salary}</b>` khi `p.salary > 0`). Không cần bổ sung field mới, chỉ cần tổng hợp `salary` của 11 cầu thủ đang trên pitch.

### 2.2 `summary-card--ovr` (OVR trung bình theo tuyến)
- Chia cầu thủ đang đá thành 3 nhóm tuyến: **FW** (tiền đạo), **MF** (tiền vệ), **DF** (hậu vệ) — GK có thể tính riêng hoặc gộp vào DF (cần xác nhận).
- Hiển thị OVR trung bình từng tuyến + OVR trung bình toàn đội (trung bình của cả 3, hoặc trung bình toàn bộ 11 cầu thủ — cần xác nhận công thức, khác nhau nếu số lượng mỗi tuyến không đều).
- OVR dùng ở đây phải là OVR **theo vị trí đá thực tế trên pitch** (đã note ở Phần 1.3, dùng `positionRatings`), không phải OVR gốc.
- Cần bảng ánh xạ `slot.pos` → nhóm tuyến (FW/MF/DF/GK), ví dụ: ST/RW/LW → FW; CM/CDM/CAM/LM/RM → MF; CB/LB/RB/LWB/RWB → DF.

### 2.3 `summary-card--team-color` — `team-color-strip` (**quan trọng nhất**)
3 nút trong `team-color-items`, mỗi nút là 1 **loại Team Color** khác nhau:

1. **Team Color CLB** — nhóm theo CLB đã/đang thi đấu (toàn bộ lịch sử club career, không chỉ club hiện tại), **hoặc** quốc gia, **hoặc** mùa giải (season) của thẻ. Đây khớp với `computeClubTeamColors()` hiện có trong `teamColor.js` (đã gộp club career + club + nation) — nhưng **thiếu tiêu chí "season/mùa giải của thẻ"**, cần bổ sung group theo `player.season`.
2. **Team Color thẻ cộng** — buff theo mức nâng cấp (upgrade level) của thẻ. Khớp với `computeUpgradeTeamColors()` hiện có (tier đồng/bạc/vàng/bạch kim theo `upgradeLevel`).
3. **Team Color liên kết** — các bộ liên kết đặc biệt, định nghĩa thủ công theo tên cầu thủ cụ thể, ví dụ **"Bức tường thành Quỷ Đỏ"** = Ferdinand + Vidic + Van der Sar.

⚠️ **Quan trọng — clone đầy đủ DATA THẬT cho cả 3 loại (không chỉ loại 3), cần thu thập từ fifaaddict trước khi code:**
- **Loại 1 (CLB/Quốc gia/Season)**: xác nhận lại đúng ngưỡng số lượng + buff thật của fifaaddict cho từng kind (club/nation/season có thể có ngưỡng khác nhau) — hiện `CLUB_TIER_THRESHOLDS` trong code là số tự suy đoán/áng chừng trước đó, **cần đối chiếu số liệu thật**.
- **Loại 2 (thẻ cộng theo upgrade level)**: xác nhận lại đúng range level theo tier (đồng/bạc/vàng/bạch kim) + ngưỡng buff thật — `UPGRADE_TIERS` hiện tại cũng cần đối chiếu lại với fifaaddict, không chắc đã đúng.
- **Loại 3 (liên kết)**: hoàn toàn mới, chưa có trong code — cần catalog đầy đủ tên bộ + danh sách cầu thủ + buff.
- → Cả 3 loại đều cần 1 đợt thu thập data thật (research/scrape fifaaddict) làm riêng, sau khi note xong toàn bộ các phần UI. Thiết kế data: loại 1 & 2 dùng cơ chế nhóm-động (group theo field, có ngưỡng số lượng), loại 3 dùng catalog cố định (ví dụ `LINKED_TEAM_COLORS`, mỗi bộ có tên + danh sách cầu thủ yêu cầu + buff, kiểm tra đủ member).
- **Bổ sung: đợt thu thập data này phải kèm cả icon/asset hình ảnh của từng nhóm/bộ Team Color** (badge CLB, cờ quốc gia, icon season, icon riêng từng bộ liên kết) — dùng chung cho cả `team-color-strip` (header) và `pitch-teamcolor-list` (pitch, xem Phần 3), clone trực tiếp từ fifaaddict (URL ảnh hoặc tải về lưu local asset).

### Hành vi tương tác chung cho cả 3 loại (team-color-strip)
- Click hoặc hover vào 1 icon/nhóm active → highlight/hiển thị **những cầu thủ thuộc nhóm đó** trên pitch (làm nổi bật card, có thể dim các card khác).
- Cần UI cho cả 3 loại dùng chung 1 kiểu tương tác (hover/click → highlight), áp dụng lên `PlayerCardMini` trên pitch.

### Việc cần làm tiếp cho Phần 2
- Xác nhận GK thuộc nhóm DF hay tách riêng trong `summary-card--ovr`.
- Thu thập/đối chiếu data thật cho cả 3 loại Team Color (ngưỡng + buff loại 1 & 2, catalog đầy đủ loại 3) từ fifaaddict — việc lớn, làm riêng sau khi note xong các phần UI còn lại (đã được user xác nhận).

---

## Phần 3: `pitch-teamcolor-row`

- Hiển thị `pitch-teamcolor-list`: danh sách icon clickable cho **từng Team Color đang active** dựa trên cầu thủ đã chọn trong đội hình (tổng hợp từ cả 3 loại ở Phần 2.3, không chỉ 1 loại).
- Hover hoặc click vào 1 icon trong list → highlight các cầu thủ thuộc team color đó trên pitch (cùng cơ chế với team-color-strip ở Phần 2.3).
- `pitch-capture-button`: nút chụp ảnh (capture) đội hình vừa build thành 1 hình ảnh — tương ứng phần "Capture Squad" đã liệt kê sơ bộ ở tổng quan (phần 6 trang gốc), sẽ note chi tiết kỹ thuật khi tới lượt.
- ✅ **Xác nhận (không phải "có thể" như note trước)**: `pitch-teamcolor-list` và `team-color-strip` (Phần 2.3) là **CÙNG 1 nguồn dữ liệu**, chỉ khác chỗ hiển thị và mục đích tương tác:
  - `team-color-strip` (header, Phần 2.3): hiển thị đầy đủ 3 loại + breakdown chỉ số/OVR được cộng khi active (xem Phần 1.4).
  - `pitch-teamcolor-list` (pitch, Phần 3): dùng để **hover/click → highlight cầu thủ thuộc team color đó ngay trên pitch**, kèm **icon hình ảnh riêng cho từng team color/nhóm** (không phải chỉ text như panel hiện tại `fco-squad-panel` trong `SquadView.jsx`).
  - → Icon ảnh cần **clone trực tiếp từ fifaaddict** (ví dụ badge CLB, cờ quốc gia, icon season, icon riêng cho từng bộ liên kết) — gộp chung vào đợt thu thập data Team Color đã note ở Phần 2.3 (thu thập tên nhóm + buff + **kèm cả URL/asset icon** của từng nhóm/bộ liên kết).
  - Cả 2 nơi (`team-color-strip` và `pitch-teamcolor-list`) phải dùng chung 1 state "đang hover/active nhóm nào" để đồng bộ highlight — hover ở panel header cũng phải highlight card trên pitch và ngược lại, không phải 2 luồng tương tác độc lập.

---

---

## Phần 4: `header-controls-actions`

### 4.1 `formationSelect` — đã note ở Phần 1 (bỏ qua, không lặp lại).

### 4.2 `squad-level-toggle`
- Toggle 2 trạng thái: **Lvl 1** ↔ **Lvl 5**.
- Áp dụng **đồng loạt cho cả 11 cầu thủ** trên pitch cùng lúc — set `level` (tham số flat bonus, xem 4.4) = 1 hoặc 5 cho toàn đội, giúp so sánh nhanh OVR đội ở 2 mức chuẩn.
- Dùng chung khái niệm `level` như ở `fa-upgrade-panel` (trang detail): field `level` trong `getDetailBonusModel({ grade, level, teamColorBonus })` — range 1-5, mỗi bậc trên 1 cộng +1 flat stat bonus (`levelStatBonus = clampInteger(level, 1, 5) - 1`). **Lưu ý: đây khác với `upgradeLevel`/`grade` (nâng cấp thẻ) đang dùng trong `SquadView.jsx` hiện tại** — cần làm rõ 2 khái niệm `level` (flat bonus theo lvl 1-5) vs `upgradeLevel`/`grade` (FO4 Grade +1..+13, dùng `getOvrIncreaseForLevel`) không bị lẫn nhau khi tích hợp vào Squad.

### 4.3 `card-view-toggle`
- Toggle chế độ hiển thị card trên pitch, chuyển đổi giữa 2 layout:
  - Có `card-bg-img`/`fc-bg` (ảnh nền season đầy đủ) + `card-flag` — chế độ đầy đủ, giống `PlayerCardMini` hiện tại.
  - Chế độ khác (rút gọn?) — cần xác nhận: đây là ẩn/hiện ảnh nền + đổi layout sắp xếp chỉ số (OVR/pos/tên) sang bố cục khác, không phải ẩn hẳn card. **TODO hỏi thêm**: layout thứ 2 trông như thế nào cụ thể (chỉ đổi bố cục text hay đổi hẳn kích thước card)?

### 4.4 `header-bulk-reinforce-btn`
- Tăng/giảm nhanh **Grade** (FO4 Grade, range +1..+13, giống `GRADE_OPTIONS` ở trang detail) cho cầu thủ, áp dụng hàng loạt cho cả đội — cùng cơ chế click nút trong `fa-upgrade-panel` (`GradeSelector`) ở trang chi tiết cầu thủ (`http://localhost:5173/players/6a3171e35e6c2103bf42549b`).
- **Công thức tái sử dụng trực tiếp từ `client/src/fco/views/detailBonus.js`** (không tạo công thức mới):
  - `getDetailBonusModel({ grade, level, teamColorBonus })` → trả về `{ gradeOvrBonus, gradeStatBonus, levelStatBonus, bonusStatBonus, flatBonus, statBonus, ovrBonus }`.
  - `grade`: dùng `getOvrIncreaseForLevel(grade)` (từ `upgradeHelpers.js`, cùng công thức nâng cấp thẻ theo cấp — cấp 1..13) cho cả `gradeOvrBonus` và `gradeStatBonus`.
  - `level`: flat bonus theo lvl 1-5 (xem 4.2).
  - `teamColorBonus`: flat bonus 0-10 (từ team color, xem Phần 2.3/3).
  - `applyDetailBonuses(player, bonuses)` → cộng `ovrBonus` vào `ovr` + từng `positionRatings[].value`, cộng `statBonus` vào 6 chỉ số phụ (`pace/shooting/passing/dribbling/defending/physical`), cộng `statBonus + 3` (offset) vào `detailed` stats.
- Trong Squad: nút bulk-reinforce cần áp dụng `applyDetailBonuses` cho **từng cầu thủ trên cả 11 slot** theo `grade` mới chọn (giữ nguyên `level`/`teamColorBonus` hiện tại của từng cầu thủ, hoặc set đồng loạt — cần xác nhận UI: có phải input chọn 1 giá trị grade rồi áp cho tất cả, hay +1/-1 tương đối so với grade hiện tại mỗi thẻ).
- ⚠️ Lưu ý xung đột tên: `SquadView.jsx` hiện dùng field `upgradeLevel` (cấp nâng cấp, xử lý qua `updateSquadPlayerLevel`/`normalizeUpgradeLevel`) — cần xác nhận đây có phải cùng khái niệm với `grade` ở `detailBonus.js`, hay là 2 hệ thống bonus riêng biệt cần hợp nhất khi build Squad (Squad hiện tại KHÔNG dùng `detailBonus.js`, mà dùng `applySquadBonus` trong `teamColor.js` — chỉ cộng theo `upgradeLevel` + team color, chưa có khái niệm `level` (1-5) và `grade` riêng như trang detail). **Đây là điểm quan trọng cần làm rõ trước khi code**: Squad nên thống nhất theo model `detailBonus.js` (grade/level/teamColorBonus) để khớp UI mới, thay thế cách tính bonus cũ trong `teamColor.js`/`squadHelpers.js`.

### 4.5 `header-clear-squad-btn`
- Xoá toàn bộ đội hình hiện tại (reset `bySlotId` về rỗng) để build đội hình mới từ đầu.
- Có sẵn hạ tầng gần giống: `clearSlot()` trong `squadHelpers.js` (clear 1 slot) — cần hàm mới `clearSquad()` clear toàn bộ, hoặc set `bySlotId = {}` rồi `persist()`.
- Cần xác nhận: có cần confirm dialog trước khi xoá không (tránh mất công build nhầm)? — **TODO hỏi user**.

### Câu hỏi mở của Phần 4
- [ ] `card-view-toggle`: layout thứ 2 (rút gọn) trông cụ thể ra sao?
- [ ] `header-bulk-reinforce-btn`: UI chọn grade là set giá trị tuyệt đối cho cả đội, hay +1/-1 tương đối mỗi thẻ?
- [ ] Xác nhận hợp nhất model bonus: dùng `detailBonus.js` (grade/level/teamColorBonus) thay cho cách tính hiện tại trong `teamColor.js`/`squadHelpers.js` (upgradeLevel only) — đây là thay đổi kiến trúc lớn, cần chốt trước khi thực thi.
- [ ] `header-clear-squad-btn`: có cần confirm dialog không?

---

---

## Phần 5: Đăng nhập (Google/Facebook) + Sơ đồ công khai cộng đồng (`latest-public-plans`)

⚠️ **Đây là tính năng lớn nhất và tốn công nhất trong toàn bộ squadmaker clone — cần hạ tầng hoàn toàn mới, không phải chỉnh sửa nhỏ trên code có sẵn.**

### Hiện trạng hạ tầng (đã kiểm tra code)
- Dự án hiện **chỉ có `AdminUser`** (`server/src/models/AdminUser.js`) — auth nội bộ cho admin dashboard, dùng cho `AdminAuthContext`/`AdminProtectedRoute` ở phía client. **Không có** user thường (public-facing), **không có** OAuth (Google/Facebook), **không có** model nào lưu squad/đội hình vào database (Squad hiện tại chỉ lưu `localStorage` qua `SQUAD_LS_KEY` trong `squadHelpers.js` — hoàn toàn phía client, không đồng bộ server, không thể chia sẻ public).
- → Cần xây mới hoàn toàn: user model công khai, OAuth flow (Google/Facebook — cần chọn thư viện, ví dụ Passport.js hoặc OAuth client trực tiếp), model `SquadPlan` (hoặc tên tương tự) để lưu đội hình đã build + gắn với user + cờ public/private, API endpoints CRUD cho squad plans, trang danh sách/tìm kiếm public plans.

### 5.1 Đăng nhập Google/Facebook — ✅ Đã chốt hướng kiến trúc (⏸️ hoãn thực thi, làm sau vì ảnh hưởng lớn)
- Mục đích: cho phép user **lưu lại đội hình** (không chỉ localStorage cục bộ) và **chia sẻ công khai** với người dùng khác.
- **Đã xác nhận hiện trạng**: admin auth hiện tại dùng **`express-session`** (cookie-based, `server/src/server.js:63-74`), **KHÔNG dùng JWT** — đã kiểm tra `server/package.json` và toàn bộ `server/src`, không có `jsonwebtoken` dependency, không nơi nào dùng JWT hiện tại.
- **Quyết định kiến trúc đã chốt (theo yêu cầu user)**: **đổi sang JWT với access token + refresh token**, áp dụng luôn cho cả **admin** (thay thế `express-session` hiện tại) lẫn **public user** (Google/Facebook login) — dùng chung 1 kiến trúc JWT thống nhất toàn hệ thống, không giữ 2 cơ chế auth khác nhau (session cho admin, JWT cho user) để tránh phức tạp/không nhất quán.
- **Hướng làm cụ thể**:
  - **Access token**: JWT thời gian sống ngắn (ví dụ 15 phút), gửi qua header `Authorization: Bearer` — dùng để xác thực mỗi request API.
  - **Refresh token**: thời gian sống dài hơn (ví dụ 7-30 ngày), dùng để cấp lại access token mới khi hết hạn. Lưu ở `httpOnly` cookie (an toàn hơn `localStorage`, tránh XSS đánh cắp token) hoặc lưu trong DB (model `RefreshToken` hoặc field trên `User`/`AdminUser`) để có thể revoke thủ công (đăng xuất, đổi mật khẩu, phát hiện bất thường).
  - Cần thêm dependency `jsonwebtoken` (hiện chưa có trong `server/package.json`).
  - **Migration cho AdminUser**: thay `adminAuth.controller.js` từ set `req.session.*` sang cấp access+refresh token; `AdminProtectedRoute`/`AdminAuthContext` phía client đổi từ dựa vào cookie session sang lưu/gửi access token (kèm logic tự động refresh khi access token hết hạn).
  - Có thể **bỏ `express-session` hoàn toàn** khỏi `server.js` sau khi migrate xong (không còn nơi nào dùng).
  - **User (public) login Google/Facebook**: dùng **Passport.js** (`passport-google-oauth20` + `passport-facebook`) chỉ để lấy profile từ provider (không dùng passport-session) → sau khi xác thực OAuth thành công, tự cấp access+refresh token JWT giống hệt cơ chế admin, dùng chung middleware xác thực JWT.
  - Tạo model **`User`** mới, tách biệt khỏi `AdminUser` (schema riêng, vì user thường không cần `passwordHash`/role admin) — nhưng dùng chung cơ chế cấp/xác thực token.
  - Route riêng: `/api/auth/google`, `/api/auth/facebook`, `/api/auth/refresh` — tách khỏi `/api/admin/auth`.
  - `User` lưu `googleId`/`facebookId` trực tiếp trên model (đủ dùng hiện tại, không cần bảng `Account` kiểu NextAuth trừ khi cần multi-provider-link sau này).
  - Cần đăng ký OAuth app credentials (Google Cloud Console, Facebook Developer) — việc này **user tự làm**, không thể tự động hoá.
- **⏸️ Trạng thái: HOÃN THỰC THI** — theo quyết định của user, toàn bộ Phần 5 (kể cả việc migrate admin sang JWT) sẽ làm ở đợt sau vì ảnh hưởng kiến trúc khá lớn (đổi cơ chế auth đang chạy của admin, model mới, route mới). Squad Builder ở đợt hiện tại chỉ cần hoạt động đầy đủ với lưu **localStorage** (đã có sẵn qua `squadHelpers.js`), chưa cần server-side persistence hay share công khai.

### 5.2 `latest-public-plans__header` + `latest-public-plans__table` (danh sách trên trang squadmaker chính)
- Bảng rút gọn hiển thị các đội hình công khai mới nhất, dùng class biến thể:
  - `public-plans-table--compact`: bản compact.
  - `public-plans-table--compact-no-fp`: bản compact, **ẩn cột lương (FP = FIFA Points/lương)** — cần xác nhận `fp` = viết tắt của gì (nghi là "FIFA Points" tức lương/giá trong game, khớp với `summary-card--fp` đã note ở Phần 2.1).
- Mỗi dòng trong bảng: preview nhanh 1 đội hình đã chia sẻ (formation, có thể kèm OVR trung bình, tên người tạo...) — cần xem thêm chi tiết cột nào hiển thị khi tới lượt đi sâu.

### 5.3 `latest-public-plans__link` → trang `/vn/fco-squadmaker/plans`
- Click vào link "xem thêm" → điều hướng sang **trang riêng** để browse/query toàn bộ các squad đã public — có filter/search riêng (theo formation, OVR, người tạo...).
- Trong fco-hub: cần trang mới tương ứng, ví dụ route `/fco/squad/plans` hoặc tương tự (đặt tên theo convention hiện có của router `FcoApp.jsx`).
- Cần API backend hỗ trợ list + filter + phân trang cho squad plans công khai — model `SquadPlan` cần field: `formationId`, `bySlotId` (hoặc dạng serialize khác), `ownerId`, `isPublic`, `createdAt`, có thể cả snapshot OVR trung bình/lương để query nhanh không cần tính lại mỗi lần.

### Việc cần làm tiếp cho Phần 5
- Đây là hạng mục cần **tách thành plan/spec riêng** khi bắt tay code (không gộp chung với các phần UI thuần Squad/Pitch khác) vì đụng tới: auth mới, database schema mới, API mới, và cả pháp lý/bảo mật (OAuth credentials, quyền riêng tư dữ liệu user).
- Cần user quyết định độ ưu tiên: có làm ngay trong đợt này hay để version sau (Squad Builder có thể hoạt động đầy đủ ở chế độ "chỉ lưu local" trước, phần share-public làm sau).

---

## Các phần chưa note (theo cấu trúc trang gốc)
- [ ] Bộ lọc & tìm cầu thủ (trang danh sách chính, không phải trong search-modal đã note ở Phần 1.5)
- [ ] QL đội hình (lưu/tải nhiều đội hình — có thể liên quan tới Phần 5 nếu cần lưu server-side)
- [ ] Capture Squad (chụp ảnh sân) — chi tiết kỹ thuật
- [ ] Chia sẻ mạng xã hội (có thể liên quan tới Phần 5)

## Câu hỏi mở — ĐÃ CHỐT (2026-07-03)
- [x] Case cầu thủ không có `positionRatings` cho slot.pos (Phần 1.3): **đã điều tra thực tế** — `extractPositionRatings` (server/src/services/fifaAddictSource.js:663) là sparse, KHÔNG backfill đủ mọi vị trí (bằng chứng: filter theo `postlist` nguồn ngoài + loại bỏ entry `value <= 0`, không loop qua canonical position list). `DetailView.jsx` đã có tiền lệ fallback `{ label: pos, value: null }`. **Quyết định: dùng OVR gốc (`player.ovr`) + hiển thị cảnh báo trực quan (icon/màu) khi slot.pos không có rating tương ứng.**
- [x] Range lương tối đa người dùng được chọn (Phần 2.1): **mặc định 300, cho phép chỉnh tối đa 9999** (không giới hạn cứng slider, input số free trong khoảng 0-9999).
- [x] GK thuộc DF hay tách riêng trong summary OVR theo tuyến (Phần 2.2): **tách riêng GK** — 4 nhóm GK/DF/MF/FW.
- [ ] Đối chiếu/thu thập data thật cho cả 3 loại Team Color — ngưỡng+buff (loại 1, 2) và catalog đầy đủ (loại 3) (Phần 2.3) — **vẫn để riêng, tách thành 1 task/agent research độc lập trước khi code UI Team Color**, không đoán số liệu.
- [x] Quan hệ data giữa `team-color-strip` (header) và `pitch-teamcolor-list` (pitch) (Phần 3): **dùng chung 1 nguồn data tính active team colors**, nhưng cách hiển thị khác nhau — `team-color-strip` (header) hiển thị chi tiết breakdown (từng team color đang cộng bao nhiêu, cộng chỉ số gì); `pitch-teamcolor-list` chỉ hiển thị button icon/image (fetch từ fifaaddict) để hover/click highlight các thẻ liên quan trên pitch.
- [x] `card-view-toggle` layout thứ 2 (Phần 4.3): **gồm avatar + tên + OVR + Lương + Mùa + Vị trí đang được xếp vào** (không phải rút gọn tối đa, mà là bổ sung thêm salary/season/slot-position so với card mini hiện tại).
- [x] `header-bulk-reinforce-btn` (Phần 4.4): **set giá trị tuyệt đối cho cả đội** (chọn 1 grade cụ thể → áp dụng đồng loạt set grade đó cho toàn bộ 11 cầu thủ, ghi đè grade hiện tại của từng thẻ).
- [x] Hợp nhất model bonus Squad theo `detailBonus.js` (Phần 4.4) — **QUYẾT ĐỊNH: KHÔNG hợp nhất.** Giữ nguyên 2 hệ thống riêng — Squad tiếp tục dùng `teamColorBonus`/`upgradeLevel` như hiện tại trong `teamColor.js`/`squadHelpers.js`, KHÔNG chuyển sang model `grade/level/teamColorBonus` của `detailBonus.js`. Lý do (user xác nhận): khi chọn cầu thủ vào squad, `teamColorBonus` đã được cộng thẳng vào thẻ ngay từ bước chọn, không cần lớp tính tuyến-tính grade/level riêng như trang detail. → **`squad-level-toggle` (Phần 4.2) và `header-bulk-reinforce-btn` (Phần 4.4) áp dụng trực tiếp lên field `level`/`grade` hiện có trong squad state (per-slot), KHÔNG đưa qua `getDetailBonusModel`.**
- [x] `header-clear-squad-btn` (Phần 4.5): **có, cần confirm dialog** trước khi xoá toàn bộ đội hình.
- [ ] Buff Team Color tách riêng theo từng chỉ số hay flat OVR chung (Phần 1.4): phụ thuộc data thật thu thập — để lại, quyết định sau khi có data (đi kèm task research Team Color ở Phần 2.3).
- [x] Chỉ dấu trực quan bonus Team Color trên card (Phần 1.4): **icon nhỏ ở góc card**, tương ứng loại team color đang active.
- [ ] Sidebar filter thật trên fifaaddict search-modal có khớp hết filter backend không (Phần 1.5): cần xem UI thật fifaaddict trước khi thiết kế — để lại làm task riêng khi bắt tay code Search Modal.
- [x] Click vào cầu thủ trong kết quả search-modal để xem detail (Phần 1.6): **mở tab mới**, giữ nguyên tiến trình build squad ở tab hiện tại.
- [x] Layout `player-edit-modal` (Phần 1.7): **modal nổi giữa màn hình** (tái dùng style modal sẵn có kiểu `PlayerPicker`). Trigger: nút nhỏ `card-edit-btn` xuất hiện ở góc trái-trên của `PlayerCardMini` khi hover (giống fifaaddict gốc). Field `grade` trong modal dùng **chung 1 field grade per-slot** với `header-bulk-reinforce-btn` — không tách 2 field riêng, 1 nguồn sự thật duy nhất trên state của slot.
- [x] Giữ 2 nút nhỏ hiện tại (đổi vị trí, xoá) song song với modal edit khi hover (Phần 1.7): **bỏ nút đổi vị trí** (dư thừa vì đã có kéo-thả). Khi hover card trên pitch chỉ còn lại **2 nút: Xoá + Edit** (edit mở `player-edit-modal`).
- [x] Click vào dòng cầu thủ trong `desktop-rail__roster-list` (Phần 1.8): **tách hành vi theo vùng click cụ thể** —
  - Hover `desktop-roster-slot--filled` → hiện nút **Edit** (thay vì chỉ nút Xoá như note cũ) → mở **cùng `player-edit-modal`** với Phần 1.7 (không tạo modal thứ 2).
  - Click riêng vào `desktop-roster-slot__name-line` (tên cầu thủ) → mở modal kiểu `DetailView` (hoặc mở `DetailView` ở tab mới) — đây là hành vi xem-chi-tiết-đầy-đủ, tách biệt với edit nhanh trong squad.
- [x] Tên `placement` cho `MonetizationSlot` mới trong desktop-rail (Phần 1.8): **`squad-builder-sidebar-top`**.
- [~] `fp` trong `public-plans-table--compact-no-fp` (Phần 5.2): thuộc Phần 5 (đã hoãn hoàn toàn) — không cần xác nhận cho đợt thực thi này.
- [x] Hệ quả của việc KHÔNG hợp nhất `detailBonus.js` (bổ sung, 2026-07-03): vì Squad chỉ còn field `upgradeLevel` (FO4 Grade 1-13), không còn khái niệm `level` (1-5) riêng —
  - `squad-level-toggle` (Phần 4.2): đổi nghĩa thành toggle nhanh `upgradeLevel` giữa **1 ↔ 13** (2 thái cực) thay vì "Lvl 1 ↔ Lvl 5" như note gốc (không áp dụng được vì không còn field `level` tách biệt).
  - `header-bulk-reinforce-btn` (Phần 4.4): nâng cấp từ 5 preset hiện tại (`QUICK_LEVELS = [1,5,8,10,13]` trong `SquadView.jsx`) thành **grade selector đầy đủ 1-13** (giống `GradeSelector` ở `DetailView.jsx`), set tuyệt đối `upgradeLevel` cho cả 11 cầu thủ khi chọn — tái dùng cơ chế `applyQuickLevel()` đã có, chỉ đổi UI hiển thị.
