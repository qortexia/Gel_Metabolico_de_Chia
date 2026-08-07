# Botões de apoio dev-only (reset do quiz + liberar CTA do VSL) — Design

> Status: aprovado em conversa (2026-08-04).

## 1. Objetivo

Durante o desenvolvimento/teste do funil, Eduardo precisa reiniciar o quiz do zero
(voltar para a tela 1 e limpar todas as respostas) sem depender de limpar
`localStorage` manualmente. Isso é uma ferramenta de conveniência para uso pessoal
enquanto o funil está sendo construído — **não** é uma feature para os usuários finais.

## 2. Escopo

- Botão visível **apenas** quando `process.env.NODE_ENV === 'development'` (ou seja,
  `npm run dev` local). Não aparece em nenhum build de produção/deploy.
- Ao clicar, chama `reset()` do `useQuizStore` (já existe em
  [store.ts](../../../src/lib/store.ts)): volta `currentIndex` para `0` e `answers`
  para `INITIAL_ANSWERS`.
- Sem confirmação — clique único, ferramenta pessoal de teste.

## 3. Implementação

- Novo componente `src/components/dev/DevResetButton.tsx` (client component):
  - Retorna `null` fora de `development`.
  - Botão fixo (`fixed`, canto inferior direito, `z-50`), estilo visualmente "de
    debug" (borda tracejada / cor neutra) para não ser confundido com UI real do
    funil.
- Renderizado como **irmão** de `<QuizFunnel />` em `src/app/page.tsx` — não dentro de
  `QuizFunnel.tsx`, para não mexer nos 8 branches de retorno (`choice`/`slider`/
  `text`/`loader`/`imc`/`projection`/`vsl`/`offer`) e garantir que fica visível em
  qualquer tela.

## 4. Teste

`DevResetButton.test.tsx` (vitest + testing-library), usando `vi.stubEnv('NODE_ENV', ...)`
para verificar:
- Renderiza em `development`.
- Não renderiza fora de `development` (ex: `test`/`production`).
- Clique chama `reset()` do store.

## 5. Liberar CTA do VSL (dev-only)

Mesma motivação: durante a edição, esperar o tempo de gate (`revealAtSeconds` /
`revealSecondsBeforeEnd`) do [GatedVSL.tsx](../../../src/components/vsl/GatedVSL.tsx)
para ver o CTA e testar o resto do funil é lento.

- Diferente do reset do quiz, o estado `revealed` é local ao `GatedVSL` (não vive no
  Zustand store) — então o botão vive **dentro do próprio `GatedVSL.tsx`**, não em
  `page.tsx`. Isso também faz com que ele só apareça quando uma tela de VSL está
  ativa (VSL1 ou VSL2, ambas usam o mesmo componente).
- Mesma gate: só renderiza com `process.env.NODE_ENV === 'development'`.
- Some assim que `revealed` já é `true` (o CTA real já está visível, não há mais o
  que liberar).
- Ao clicar, chama `setRevealed(true)` diretamente — não avança a tela sozinho, só
  libera o botão do CTA real, que o usuário/editor clica normalmente.
- Mesmo estilo visual do `DevResetButton` (pílula, borda tracejada), fixo no canto
  inferior **esquerdo** (o reset do quiz já ocupa o canto inferior direito).

