# Card theme coverage after verification

## Verified route

- `/doi-hinh`

## Cloned local assets

- None.

## External/season visual fallback

- None observed during this verification pass.

## Missing or CSS fallback

- All players currently use `card-theme-fallback` because no specific seasons have been cloned yet. This is expected behavior for the first implementation pass.

## Notes

- `card-bg-img fc-bg` exists on filled squad cards, correctly using the fallback theme.
- `card-edit-btn` and remove button appear on hover.
- `Đổi vị trí` and `.fco-squad-cardlevel` are absent.
- The new FcoPlayerCard renderer is used in place of the old PlayerCardMini internals.
