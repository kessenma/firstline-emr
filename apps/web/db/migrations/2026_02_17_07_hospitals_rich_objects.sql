-- Migration: Convert missions.hospitals from string[] to MissionHospital[]
-- Changes ["Hospital A","Hospital B"] to [{"name":"Hospital A"},{"name":"Hospital B"}]

UPDATE missions
SET hospitals = (
  SELECT json_agg(json_build_object('name', elem))
  FROM json_array_elements_text(hospitals) AS elem
)
WHERE hospitals IS NOT NULL AND hospitals::text != '[]' AND hospitals::text != 'null';
