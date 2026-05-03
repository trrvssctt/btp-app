# Comptes utilisateurs — BTP Manager

## Rôles et permissions

| Rôle             | Permissions                                                 |
|------------------|-------------------------------------------------------------|
| ADMIN            | Tout (REQUEST_CREATE, VALIDATE_TECH, VALIDATE_BUDGET, VALIDATE_DIRECTION, STOCK_WRITE, PURCHASE_WRITE, PROJECT_WRITE, ARTICLE_WRITE, ADMIN_ALL) |
| CHEF_PROJET      | REQUEST_VALIDATE_BUDGET, PROJECT_WRITE                      |
| CONDUCTEUR       | REQUEST_CREATE                                              |
| MAGASINIER       | STOCK_WRITE, ARTICLE_WRITE                                  |
| ACHETEUR         | PURCHASE_WRITE                                              |
| CONTROLEUR       | REQUEST_VALIDATE_BUDGET                                     |
| RESP_TECHNIQUE   | REQUEST_VALIDATE_TECH                                       |
| DEMANDEUR        | REQUEST_CREATE                                              |
| DAF              | REQUEST_VALIDATE_DIRECTION (validation finale budget)       |

---

## Liste des comptes

| Nom                | Email                          | Mot de passe    | Rôle             |
|--------------------|--------------------------------|-----------------|------------------|
| Administrateur     | admin@btp.local                | Admin123!       | ADMIN            |
| Amadou Diallo      | amadou.diallo@btp-sn.com       | Amadou2025!     | CHEF_PROJET      |
| Cheikh Diagne      | cheikh.diagne@btp-sn.com       | Cheikh2025!     | CHEF_PROJET      |
| Fatou Ndoye        | fatou.ndoye@btp-sn.com         | Fatou2025!      | CONDUCTEUR       |
| Mariama Ba         | mariama.ba@btp-sn.com          | Mariama2025!    | CONDUCTEUR       |
| Ibrahima Sow       | ibrahima.sow@btp-sn.com        | Ibrahim2025!    | MAGASINIER       |
| Moussa Faye        | moussa.faye@btp-sn.com         | Moussa2025!     | ACHETEUR         |
| Aminata Diop       | aminata.diop@btp-sn.com        | Aminata2025!    | CONTROLEUR       |
| El Hadji Ndiaye    | elhadji.ndiaye@btp-sn.com      | ElHadji2025!    | RESP_TECHNIQUE   |
| Aïssatou Mbaye     | aissatou.mbaye@btp-sn.com      | Aissatou2025!   | DEMANDEUR        |
| Oumar Sarr         | oumar.sarr@btp-sn.com          | Oumar2025!      | DEMANDEUR        |
| Directeur Financier | daf@btp-sn.com                | Daf2025!        | DAF              |
