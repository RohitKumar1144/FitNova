-- ============================================================================
-- FitNova Smart India Hackathon (SIH) — Dedicated Demo Data Seeder
-- ============================================================================
-- Purpose:
-- Populates a single dedicated FitNova demo account with realistic workout
-- history, biomechanical form accuracy, adaptive progression, and AI coach
-- feedback spanning the last 5 days.
--
-- Safety Guarantees:
-- 1. Operates ONLY on the specified demo user.
-- 2. Does NOT modify or delete any other user's records.
-- 3. Does NOT alter database schema or Row-Level Security (RLS) policies.
-- 4. Safe to run multiple times (idempotent for the designated demo user).
--
-- How to Run:
-- 1. Open Supabase Dashboard -> SQL Editor.
-- 2. Paste this entire script.
-- 3. Update the `v_demo_email` variable (or `v_demo_uuid`) below to match
--    your demo user account created in Step 29.
-- 4. Click "Run".
-- ============================================================================

DO $$
DECLARE
  -- >>> CONFIGURE YOUR DEMO ACCOUNT IDENTIFIER HERE <<<
  v_demo_email text := 'demo@fitnova.app'; -- Put your demo account email here
  v_demo_uuid  uuid := NULL;              -- Or leave NULL to lookup by email/profile name
  
  v_user_id uuid;
  v_now timestamp with time zone := NOW();
  v_plan_id uuid := gen_random_uuid();
BEGIN
  -- 1. Resolve Demo User ID
  IF v_demo_uuid IS NOT NULL THEN
    v_user_id := v_demo_uuid;
  ELSE
    -- Try finding user in auth.users by email
    SELECT id INTO v_user_id FROM auth.users WHERE email = v_demo_email LIMIT 1;
    
    -- Fallback: try finding user in profiles by name matching 'Demo'
    IF v_user_id IS NULL THEN
      SELECT id INTO v_user_id FROM public.profiles WHERE full_name ILIKE '%Demo%' ORDER BY created_at DESC LIMIT 1;
    END IF;
  END IF;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Demo user not found! Please create your demo user in /auth or update v_demo_email in this script.';
  END IF;

  RAISE NOTICE 'Seeding FitNova demo records for user ID: %', v_user_id;

  -- 2. Ensure Profile exists and has consistent Beginner metrics
  INSERT INTO public.profiles (
    id,
    full_name,
    age,
    height_cm,
    weight_kg,
    fitness_level,
    goal,
    available_time_minutes,
    equipment,
    created_at
  ) VALUES (
    v_user_id,
    'FitNova Demo',
    21,
    175,
    70,
    'beginner',
    'improve_fitness',
    30,
    ARRAY['No Equipment'],
    v_now - INTERVAL '7 days'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    age = EXCLUDED.age,
    height_cm = EXCLUDED.height_cm,
    weight_kg = EXCLUDED.weight_kg,
    fitness_level = EXCLUDED.fitness_level,
    goal = EXCLUDED.goal,
    available_time_minutes = EXCLUDED.available_time_minutes,
    equipment = EXCLUDED.equipment;

  -- 3. Clean up existing demo sessions for this specific user only (idempotency)
  DELETE FROM public.workout_sessions WHERE user_id = v_user_id;
  DELETE FROM public.workout_plans WHERE user_id = v_user_id;
  DELETE FROM public.progress_snapshots WHERE user_id = v_user_id;

  -- 4. Insert 7 Realistic Historical Workout Sessions
  -- Total Reps: 101 (Unlocks "100 Reps" badge)
  -- Active Days: 5 consecutive days (4d ago, 3d ago, 2d ago, yesterday, today -> Unlocks "3 Day Streak" badge)
  -- Total Sessions: 7 (Unlocks "First Workout" badge)
  -- Average Form: ~87% (Healthy beginner progression from 70% to 95%, "Form Master" badge accurately locked at 87%/90%)

  -- Session 1: Squats (4 days ago) — Initial baseline
  INSERT INTO public.workout_sessions (
    id, user_id, exercise_type, rep_count, good_form_reps, bad_form_reps, duration_seconds, ai_feedback, created_at
  ) VALUES (
    gen_random_uuid(),
    v_user_id,
    'squat',
    12,
    10,
    2,
    65,
    jsonb_build_object(
      'summary', 'Solid initial squat foundation! You established consistent depth and maintained steady cadence.',
      'what_went_well', jsonb_build_array('Reached 90-degree parallel depth on 10 reps', 'Maintained controlled eccentric pacing'),
      'improvements', jsonb_build_array('Slight knee valgus on final 2 repetitions as fatigue set in'),
      'next_workout_recommendation', 'Drive outward against an imaginary band to reinforce hip abduction.',
      'motivation', 'Great start! Your baseline form is strong and ready to build upon.'
    ),
    v_now - INTERVAL '4 days 2 hours'
  );

  -- Session 2: Push-ups (3 days ago) — Technique calibration
  INSERT INTO public.workout_sessions (
    id, user_id, exercise_type, rep_count, good_form_reps, bad_form_reps, duration_seconds, ai_feedback, created_at
  ) VALUES (
    gen_random_uuid(),
    v_user_id,
    'pushup',
    10,
    7,
    3,
    55,
    jsonb_build_object(
      'summary', 'Good upper body push effort. Core line remained stable across early repetitions.',
      'what_went_well', jsonb_build_array('Full elbow extension lock at the peak of each rep', 'Smooth concentric push'),
      'improvements', jsonb_build_array('Torso sagged slightly on reps 8-10 -- engage glutes and brace core'),
      'next_workout_recommendation', 'Maintain a straight plank line from shoulders to ankles throughout each rep.',
      'motivation', 'Push-ups require total body tension -- excellent work powering through all 10 reps!'
    ),
    v_now - INTERVAL '3 days 3 hours'
  );

  -- Session 3: Bicep Curls (2 days ago) — Arm mechanics
  INSERT INTO public.workout_sessions (
    id, user_id, exercise_type, rep_count, good_form_reps, bad_form_reps, duration_seconds, ai_feedback, created_at
  ) VALUES (
    gen_random_uuid(),
    v_user_id,
    'bicep_curl',
    14,
    12,
    2,
    70,
    jsonb_build_object(
      'summary', 'Clean curling mechanics with minimal shoulder swing and strong peak contraction.',
      'what_went_well', jsonb_build_array('Elbows remained pinned close to the ribcage', 'Controlled eccentric lower on 12 reps'),
      'improvements', jsonb_build_array('Minor forward shoulder drift on the 13th rep'),
      'next_workout_recommendation', 'Pause for a brief half-second contraction at the top of each curl.',
      'motivation', 'Outstanding bicep isolation! Your form discipline is noticeably advancing.'
    ),
    v_now - INTERVAL '2 days 4 hours'
  );

  -- Session 4: Squats (1 day ago / Yesterday morning) — Deep depth & improved posture
  INSERT INTO public.workout_sessions (
    id, user_id, exercise_type, rep_count, good_form_reps, bad_form_reps, duration_seconds, ai_feedback, created_at
  ) VALUES (
    gen_random_uuid(),
    v_user_id,
    'squat',
    15,
    14,
    1,
    75,
    jsonb_build_object(
      'summary', 'Impressive squat form improvement! Depth was sharp and knee tracking remained locked in.',
      'what_went_well', jsonb_build_array('93% form accuracy with upright thoracic spine', 'Zero knee collapse on 14 reps'),
      'improvements', jsonb_build_array('Slight forward lean on the 15th rep during ascent'),
      'next_workout_recommendation', 'Keep chest elevated and drive forcefully through your midfoot.',
      'motivation', 'You corrected the knee valgus identified in Session 1 -- that is real adaptive learning!'
    ),
    v_now - INTERVAL '1 day 5 hours'
  );

  -- Session 5: Push-ups (1 day ago / Yesterday evening) — Reinforced core line
  INSERT INTO public.workout_sessions (
    id, user_id, exercise_type, rep_count, good_form_reps, bad_form_reps, duration_seconds, ai_feedback, created_at
  ) VALUES (
    gen_random_uuid(),
    v_user_id,
    'pushup',
    14,
    12,
    2,
    60,
    jsonb_build_object(
      'summary', 'Strong volume increase with much cleaner spinal alignment than your previous push-up set.',
      'what_went_well', jsonb_build_array('Maintained >145 degree plank line across 12 reps', 'Consistent chest-to-floor depth'),
      'improvements', jsonb_build_array('Elbows flared slightly wide on the final repetition'),
      'next_workout_recommendation', 'Keep elbows at a 45-degree arrow angle relative to your torso.',
      'motivation', '14 solid reps with 86% form accuracy. You are building serious upper-body endurance.'
    ),
    v_now - INTERVAL '1 day 1 hour'
  );

  -- Session 6: Bicep Curls (Today / Earlier) — High precision
  INSERT INTO public.workout_sessions (
    id, user_id, exercise_type, rep_count, good_form_reps, bad_form_reps, duration_seconds, ai_feedback, created_at
  ) VALUES (
    gen_random_uuid(),
    v_user_id,
    'bicep_curl',
    16,
    15,
    1,
    80,
    jsonb_build_object(
      'summary', 'Exceptional curling form! Peak flexion angle reached under 50 degrees on 15 of 16 reps.',
      'what_went_well', jsonb_build_array('Zero body momentum or lumbar arching', '94% biomechanical accuracy'),
      'improvements', jsonb_build_array('Slight tempo acceleration on the final descent'),
      'next_workout_recommendation', 'Continue emphasizing a 2-second eccentric lowering phase.',
      'motivation', 'Consistent excellence! Your arm control is approaching athletic benchmark standards.'
    ),
    v_now - INTERVAL '3 hours'
  );

  -- Session 7: Squats (Today / Recent) — Peak performance set
  INSERT INTO public.workout_sessions (
    id, user_id, exercise_type, rep_count, good_form_reps, bad_form_reps, duration_seconds, ai_feedback, created_at
  ) VALUES (
    gen_random_uuid(),
    v_user_id,
    'squat',
    20,
    19,
    1,
    90,
    jsonb_build_object(
      'summary', 'Masterclass squat set! 20 full repetitions with an exceptional 95% form accuracy rating.',
      'what_went_well', jsonb_build_array('Flawless knee tracking and hip crease below parallel', 'Rhythm and breathing were perfectly synchronized'),
      'improvements', jsonb_build_array('Keep gaze fixed forward rather than looking down on final rep'),
      'next_workout_recommendation', 'Ready to progress target volume and increase baseline repetition targets.',
      'motivation', 'You crushed the 100 total reps milestone today! Tremendous progress over your journey.'
    ),
    v_now - INTERVAL '30 minutes'
  );

  -- 5. Insert Adaptive Workout Plan with Explicit Exercise Adaptations
  INSERT INTO public.workout_plans (
    id, user_id, plan_json, created_at
  ) VALUES (
    v_plan_id,
    v_user_id,
    jsonb_build_object(
      'title', 'Full Body Adaptive Progression (Phase 2)',
      'description', 'Calibrated for your beginner foundation with adaptive rep scaling based on camera tracking form history.',
      'duration_minutes', 30,
      'difficulty', 'beginner',
      'goal', 'improve_fitness',
      'warmup', jsonb_build_array(
        jsonb_build_object('name', 'Arm Circles & Shoulder Dislocates', 'duration_seconds', 60),
        jsonb_build_object('name', 'Bodyweight Hip Hinges', 'duration_seconds', 60),
        jsonb_build_object('name', 'Dynamic Leg Swings', 'duration_seconds', 60)
      ),
      'exercises', jsonb_build_array(
        jsonb_build_object(
          'name', 'Bodyweight Squat',
          'exercise_type', 'squat',
          'sets', 3,
          'reps', 18,
          'rest_seconds', 60,
          'instructions', 'Stand shoulder-width apart. Lower your hips down and back until thighs are parallel to the floor.',
          'reason', 'Increased target reps from 15 to 18 following 95% form score in recent session.'
        ),
        jsonb_build_object(
          'name', 'Standard Push-up',
          'exercise_type', 'pushup',
          'sets', 3,
          'reps', 12,
          'rest_seconds', 60,
          'instructions', 'Maintain a rigid plank line. Lower chest to 2 inches off the ground, then press up firmly.',
          'reason', 'Maintained 12 reps to solidify core plank alignment and elbow tuck.'
        ),
        jsonb_build_object(
          'name', 'Bicep Curl',
          'exercise_type', 'bicep_curl',
          'sets', 3,
          'reps', 16,
          'rest_seconds', 45,
          'instructions', 'Keep elbows fixed at sides. Curl with control to full flexion, pause, and lower slowly.',
          'reason', 'Increased reps to 16 following 94% accuracy with zero momentum drift.'
        )
      ),
      'cooldown', jsonb_build_array(
        jsonb_build_object('name', 'Standing Quad & Hip Flexor Stretch', 'duration_seconds', 60),
        jsonb_build_object('name', 'Doorway Chest Opener', 'duration_seconds', 60),
        jsonb_build_object('name', 'Child''s Pose Spine Decompression', 'duration_seconds', 60)
      ),
      'coach_note', 'Your squat depth and bicep control have reached high precision. Today we focus on maintaining your 5-day streak while consolidating push-up plank stability.',
      'adaptations', jsonb_build_array(
        jsonb_build_object(
          'exercise_type', 'squat',
          'previous_reps', 15,
          'next_reps', 18,
          'direction', 'increase',
          'form_accuracy', 95,
          'completion_rate', 100,
          'reason', 'Excellent form (95%) and full volume completion -- increasing target reps.'
        ),
        jsonb_build_object(
          'exercise_type', 'pushup',
          'previous_reps', 12,
          'next_reps', 12,
          'direction', 'maintain',
          'form_accuracy', 86,
          'completion_rate', 100,
          'reason', 'Good form (86%) and completion -- building consistency with current workload.'
        ),
        jsonb_build_object(
          'exercise_type', 'bicep_curl',
          'previous_reps', 14,
          'next_reps', 16,
          'direction', 'increase',
          'form_accuracy', 94,
          'completion_rate', 100,
          'reason', 'High biomechanical stability (94%) with minimal shoulder drift -- advancing reps.'
        )
      )
    ),
    v_now - INTERVAL '20 minutes'
  );

  -- 6. Insert Current Progress Snapshot
  INSERT INTO public.progress_snapshots (
    id, user_id, total_sessions, total_reps, streak_days, updated_at
  ) VALUES (
    gen_random_uuid(),
    v_user_id,
    7,
    101,
    5,
    v_now
  );

  RAISE NOTICE 'Successfully seeded 7 demo sessions, 1 adaptive plan, and progress snapshot for FitNova Demo!';
END $$;
