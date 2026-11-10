<div align="center">

# 🍿 CineLog — Diário Pessoal de Idas ao Cinema

**Inspirado no visual do Letterboxd • Controle de Sessões, Gastos, Estatísticas e Próximas Estreias**

[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase&logoColor=black)](https://supabase.com/)
[![TMDB](https://img.shields.io/badge/TMDB-API-01B4E4?style=for-the-badge&logo=themoviedatabase&logoColor=white)](https://www.themoviedb.org/)

</div>

---

## ✨ Sobre o Projeto

O **CineLog** é uma aplicação web progressiva (PWA) criada para registrar e analisar todas as suas idas ao cinema. Diferente de um catálogo comum de filmes assistidos em casa, o CineLog foca na **experiência da sala de cinema**: formato da sessão (**IMAX**, **XD**, **3D**, **2D**), origem do ingresso (**Club**, **Voucher**, **Comprado**), áudio, companhias por pessoa, sala/assento, custo total da saída e tempo de tela grande.

---

## 📸 Screenshots (Telas do App)

> 💡 **Como colocar seus prints aqui:**
> - **Opção 1 (Mais rápida pelo navegador no GitHub):** Clique no ícone de lápis (**Edit file**) neste `README.md` lá no GitHub e **arraste/cole (`Ctrl+V`)** seus prints diretamente nos blocos abaixo — o GitHub gera o link da imagem sozinho!
> - **Opção 2 (Pela pasta do projeto):** Salve os prints na pasta `docs/screenshots/` com os nomes indicados abaixo e dê `git push`.

### 1. Tela Inicial (Resumo do Mês, Meta Anual, Dias sem ir ao Cinema e Últimas 4 Idas)
<!-- Substitua ou cole seu print abaixo -->
![Tela Inicial do CineLog](docs/screenshots/01-home.png)
*👉 Sugestão de print: Tela inicial mostrando o painel de métricas no topo, os 3 botões principais (`Adicionar Ida`, `Visualizar Dados`, `Em Breve`) e os 4 últimos filmes com as tags oficiais `IMAX`/`XD`, `PRÉ`/`RE`, `SOZ`/`ACO`, estrelas e data da ida.*

### 2. Galeria de Pôsteres & Diário Mensal Detalhado
| Galeria de Pôsteres | Diário Mensal |
| :---: | :---: |
| ![Galeria](docs/screenshots/02-galeria.png) | ![Diário](docs/screenshots/03-diario.png) |

*👉 Sugestão de print: Na esquerda, a aba **Galeria** com seus pôsteres escolhidos; na direita, a aba **Diário** mostrando a barra de cada mês com `Qtd de Filmes • Valor Gasto • Tempo de Tela • ACO/SOZ • Média de Nota`.*

### 3. Estatísticas Completas & Evolução Mensal
<!-- Substitua ou cole seu print abaixo -->
![Estatísticas do CineLog](docs/screenshots/04-estatisticas.png)
*👉 Sugestão de print: Aba **Estatísticas** destacando a Meta Anual, Gasto Médio por Ida, Tempo Total na Sala de Cinema, Gráfico Mensal (Jan–Dez), Dia da Semana Favorito e o ranking triplo de **Gêneros**, **Atores** e **Estúdios/Produtoras**.*

### 4. Em Breve, Quero Ver no Cinema & Ficha Técnica
| Próximas Estreias & Em Cartaz | Ficha Técnica do Filme |
| :---: | :---: |
| ![Em Breve](docs/screenshots/05-em-breve.png) | ![Modal de Detalhes](docs/screenshots/06-detalhes-filme.png) |

*👉 Sugestão de print: Página **Em Breve** com os filtros `📅 Mais Próximos` e `✨ Mais Aguardados`, e o modal aberto ao clicar em um filme exibindo estreia, duração, diretor, 3 atores principais, estúdio e sinopse.*

---

## 🚀 Funcionalidades Principais

### 🎬 Registro Inteligente de Sessões (Integração TMDB)
- **Busca Instantânea com Feedback em Tempo Real:** Ao digitar o nome do filme, o CineLog busca automaticamente no **TMDB** o título em português, título original, data de estreia oficial, duração em minutos, gêneros, diretor, **3 atores principais** e **estúdio/produtora** (`Disney`, `Pixar`, `Marvel Studios`, `Warner Bros.`, `Universal`, `Sony Pictures`, `Paramount`, `A24`, `MUBI`, `NEON`, `Amazon MGM`, `Globo Filmes`, etc.).
- **Troca Manual de Pôsteres (Estilo Letterboxd):** Escolha qualquer pôster alternativo oficial da galeria do TMDB (PT-BR, Original em Inglês ou Sem Texto) ou cole uma URL personalizada.
- **Avaliação com Meia Estrela (`0.5★` a `5.0★`):** Sistema interativo de estrelas estilo Letterboxd.
- **Companhias Individuais:** Adicione cada pessoa que foi com você separadamente (com sugestões rápidas das suas companhias mais frequentes) ou marque sessão solo.
- **Sala, Assento e Comentário Rápido:** Registre qual sala/poltrona sentou e suas impressões da sessão.

### 🏷️ Tags Automáticas e Visuais Oficiais
- **Formatos Oficiais (`IMAX`, `XD`, `3D`, `2D`):** Badges estilizados com a identidade visual oficial da **IMAX** e **Cinemark XD**.
- **Pré-estreia (`PRÉ`):** Ativada automaticamente quando a data da sua ida é anterior à estreia oficial do filme.
- **Reexibição (`RE`):** Aplicada automaticamente (inclusive de forma retroativa) sempre que a ida ao cinema ocorre mais de 1 ano após o lançamento oficial do filme.
- **Reassistido (`Rewatch ↻`):** Detecta automaticamente se você já registrou o mesmo filme antes ou permite marcar manualmente caso você já tivesse visto o filme em outro momento da vida.
- **Tag de Companhia (`SOZ` / `ACO`):** Identificação rápida nos pôsteres indicando se você foi **Sozinho (`SOZ`)** ou **Acompanhado (`ACO`)**.

### 📊 Estatísticas e Métricas de Cinéfilo
- **Painel na Tela Inicial:**
  - Idas no mês atual com comparativo automático (**acima/abaixo da sua média mensal**).
  - Total no ano + progresso da sua **Meta Anual de Cinema**.
  - **Contador de dias sem ir ao cinema** (com a data da última sessão).
- **Análise Financeira e de Tempo:**
  - **Gasto Médio por Ida**, **Média de Gasto Mensal** e **Gasto Total Acumulado** (englobando ingresso, pipoca, estacionamento/transporte).
  - **Tempo Total na Sala de Cinema** convertido em horas e minutos (`Xh Ym`).
  - **Custo Médio por Origem de Ingresso** (`Club`, `Voucher`, `Comprado`).
- **Gráficos e Rankings:**
  - **Gráfico de Evolução Mensal (`Jan – Dez`)** com quantidade de idas e valor gasto em cada mês.
  - **Dia da Semana Favorito** com gráfico de distribuição de Domingo a Sábado.
  - **Top Gêneros, Top Atores e Top Estúdios/Produtoras** mais vistos na telona.
  - **Top Cinemas** mais frequentados e **Ranking de Companhias** por pessoa.

### 📅 Radar "Em Breve" & Lista "Quero Ver no Cinema"
- **Quero Ver no Cinema:** Salve os filmes que você planeja assistir na telona, ordenados automaticamente do mais próximo (ou já **Em Cartaz**) para o mais distante. Quando assistir, clique em **"Já Fui!"** para abrir o registro já preenchido.
- **Próximas Estreias Curadas:** Lista de estreias futuras filtrada para destacar grandes lançamentos, documentários comentados e filmes cotados para premiações/festivais, com alternância entre **📅 Mais Próximos** (ordem cronológica) e **✨ Mais Aguardados** (hype/popularidade) + paginação (**Carregar Mais +20**).
- **Em Cartaz Agora:** Os 20 filmes mais populares em exibição nos cinemas brasileiros.
- **Ficha Técnica ao Clicar:** Toque em qualquer card dentro de *Em Breve* para ver data de estreia, contagem regressiva, diretor, 3 atores principais, duração, estúdio, nota TMDB e sinopse.

### 👥 Multi-Usuário (`@usuario` + PIN), Modo Visitante e Compartilhamento
- **Modo Demonstração para Novos Visitantes:** Quem abre o site pela primeira vez vê uma vitrine de exemplo interativa com dicas de uso, sem expor dados pessoais.
- **Contas Independentes (`@usuario` + PIN de 4 dígitos):** Qualquer pessoa pode criar seu próprio `@usuario` e PIN diretamente pelo site, salvando os dados na nuvem sem precisar configurar chaves ou criar conta no Supabase.
- **Compartilhar Estante (`?u=seu_usuario`):** Gere um link público de leitura da sua estante para mandar para amigos ou colocar na bio.

---

## 🛠️ Tecnologias Utilizadas

- **Frontend:** React 18 + Vite
- **Estilização:** CSS3 customizado (Tema Dark inspirado no Letterboxd, responsivo para Desktop e Mobile/PWA)
- **Ícones:** Lucide React
- **Banco de Dados na Nuvem:** Supabase (PostgreSQL) com fallback automático para `localStorage`
- **Catálogo e Metadados:** TMDB API (The Movie Database) + iTunes Search API (fallback de pôsteres)

---

## ⚙️ Como Rodar Localmente

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/silveira-igor/cinelog.git
   cd cinelog
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Configure as variáveis de ambiente:**
   Crie um arquivo `.env` na raiz do projeto (baseado no `.env.example`):
   ```env
   VITE_SUPABASE_URL=https://seu-projeto.supabase.co
   VITE_SUPABASE_ANON_KEY=sua_anon_key_do_supabase
   VITE_TMDB_API_KEY=sua_api_key_do_tmdb
   ```

4. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```

---

## 🗄️ Estrutura da Tabela no Supabase

Caso queira criar seu próprio banco do zero no Supabase, basta rodar o script [`supabase_schema.sql`](./supabase_schema.sql) no **SQL Editor** do Supabase. Todos os metadados avançados (usuário, rewatch, duração, elenco, estúdio e assento) são codificados de forma transparente na tabela `cinema_visits`, sem necessidade de migrações complexas.

---

<div align="center">
  Feito para quem ama a experiência da sala escura 🎬🍿
</div>
