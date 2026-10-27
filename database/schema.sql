CREATE TABLE IF NOT EXISTS agendamentos (
  id CHAR(36) NOT NULL PRIMARY KEY,
  nome_paciente VARCHAR(255) NOT NULL,
  nome_medico VARCHAR(255) NOT NULL,
  agendado_em DATETIME(3) NOT NULL,
  status ENUM('ATIVO', 'CANCELADO') NOT NULL DEFAULT 'ATIVO',
  criado_em DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  slot_ativo VARCHAR(512)
    GENERATED ALWAYS AS (
      CASE
        WHEN status = 'ATIVO' THEN CONCAT(
          nome_medico,
          '|',
          DATE_FORMAT(agendado_em, '%Y-%m-%d %H:%i:%s.%f')
        )
        ELSE NULL
      END
    ) STORED,
  UNIQUE KEY uk_agendamentos_slot_ativo (slot_ativo),
  KEY idx_agendamentos_nome_medico (nome_medico),
  KEY idx_agendamentos_nome_paciente (nome_paciente),
  KEY idx_agendamentos_agendado_em (agendado_em)
);
