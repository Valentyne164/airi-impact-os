-- Demo seed for AIRI Impact OS. Run AFTER schema.sql.
-- Note: logs.staff_id and profiles reference auth.users, so user accounts are
-- created through the app (sign-up) — this seed populates the domain data
-- (programs, metrics, grants, commitments, expenses) so a fresh project isn't empty.

-- funders
insert into funders (id, org, email) values
  ('00000000-0000-0000-0000-0000000000f1','Government Partner','reports@partner.gc.ca'),
  ('00000000-0000-0000-0000-0000000000f2','Community Foundation','grants@youthfutures.org')
on conflict do nothing;

-- programs
insert into programs (id, name, aim, audience) values
  ('00000000-0000-0000-0000-0000000000b1','AI Literacy Program','Equip newcomers, seniors and job-seekers with practical AI skills.','Newcomers, seniors, job-seekers'),
  ('00000000-0000-0000-0000-0000000000b2','Youth Tech Program','Introduce high-school students to coding and AI through projects.','High-school students')
on conflict do nothing;

-- metrics (the staff daily-log fields & dashboard KPIs)
insert into metrics (program_id, label, kind, target, on_dashboard, base, sort_order) values
  ('00000000-0000-0000-0000-0000000000b1','People trained','number',500,true,280,0),
  ('00000000-0000-0000-0000-0000000000b1','Women & girls reached','number',200,true,108,1),
  ('00000000-0000-0000-0000-0000000000b1','Workshops delivered','yesno',25,true,14,2),
  ('00000000-0000-0000-0000-0000000000b1','Outcome evidence','text',null,false,0,3),
  ('00000000-0000-0000-0000-0000000000b2','Students reached','number',300,true,118,0),
  ('00000000-0000-0000-0000-0000000000b2','Projects completed','number',120,true,74,1),
  ('00000000-0000-0000-0000-0000000000b2','New cohort started','yesno',8,true,3,2)
on conflict do nothing;

-- grants
insert into grants (id, program_id, name, funder_id, funder_name, funder_email, amount, term_start, term_end, next_report, agreement_text) values
  ('00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000b1','AI Skills Training Grant','00000000-0000-0000-0000-0000000000f1','Government Partner','reports@partner.gc.ca',150000,'2026-01-01','2026-12-31','2026-06-16','The grantee will train 500 participants, deliver 25 workshops, ensure 40% women participation, and spend under $150,000.'),
  ('00000000-0000-0000-0000-0000000000a2','00000000-0000-0000-0000-0000000000b2','Youth Futures Fund','00000000-0000-0000-0000-0000000000f2','Community Foundation','grants@youthfutures.org',75000,'2026-02-01','2027-01-31','2026-06-09',null)
on conflict do nothing;

-- commitments for the AI Skills grant (metric_id resolved by label)
insert into commitments (grant_id, label, kind, target, metric_id)
select '00000000-0000-0000-0000-0000000000a1','Train participants','count',500, m.id
  from metrics m where m.program_id='00000000-0000-0000-0000-0000000000b1' and m.label='People trained'
union all
select '00000000-0000-0000-0000-0000000000a1','Deliver workshops','count',25, m.id
  from metrics m where m.program_id='00000000-0000-0000-0000-0000000000b1' and m.label='Workshops delivered'
union all
select '00000000-0000-0000-0000-0000000000a1','Women participation','percent',40, m.id
  from metrics m where m.program_id='00000000-0000-0000-0000-0000000000b1' and m.label='Women & girls reached'
union all
select '00000000-0000-0000-0000-0000000000a1','Spend under','budget',150000, null;

-- expenses (Spent = sum of these)
insert into expenses (grant_id, expense_date, category, amount, invoice_ref) values
  ('00000000-0000-0000-0000-0000000000a1','2026-02-10','Facilitator fees',38000,'inv-fac-q1.pdf'),
  ('00000000-0000-0000-0000-0000000000a1','2026-03-22','Materials',21000,'inv-materials.pdf'),
  ('00000000-0000-0000-0000-0000000000a1','2026-05-05','Venue',23000,'inv-venue.pdf'),
  ('00000000-0000-0000-0000-0000000000a2','2026-03-15','Mentors',18000,'inv-mentors.pdf'),
  ('00000000-0000-0000-0000-0000000000a2','2026-04-30','Equipment',12000,'inv-equip.pdf');

-- Staff logs are created through the app once staff accounts exist, e.g.:
-- insert into logs (program_id, staff_id, narrative, values, status)
-- values ('...b1', '<auth user id>', 'Beginner workshop', '{"<people metric id>":24,"<women id>":13,"<sessions id>":true}', 'approved');
