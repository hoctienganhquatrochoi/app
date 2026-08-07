-- Fix: TOPIC (mầm non) had the same sort_order as Lớp 1, so it rendered
-- below Lớp 1 in the sidebar instead of right after Level 1.
-- This shifts Lớp 1 and everything after it up by 1, freeing up sort_order = 1 for TOPIC.
update game_classes
set sort_order = sort_order + 1
where sort_order >= 1 and id <> 'c_msfh40gugr7u';
