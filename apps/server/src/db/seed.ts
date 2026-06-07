import { seedSystemAdmin } from "./seeds/seedSystemAdmin";
import { seedNewspapers } from "./seeds/seedNewspaper"
import { seedUsers } from "./seeds/seedUsers"
import { seedNewArticleCategory } from "./seeds/seedArticleCategories"
import { seedAsignRoles } from "./seeds/seedUserRoles"
import { seedArticles } from "./seeds/seedArticles";
import { seedRandomAuthors } from "./seeds/seedRandomAuthors";
import { seedEmma } from "./seeds/seedEmma";
import { seedArticleReviews } from "./seeds/seedArticleReviews";
import { seedLikes } from "./seeds/seedLikes";
import { seedComments } from "./seeds/seedComments";
import { seedArticleViews } from "./seeds/seedArticleViews";
import { seedE2eUsers } from "./seeds/seedE2eUsers";
import { seedSeedUser } from "./seeds/seedSeedUser";


async function seed() {
    await seedSystemAdmin();
    await seedNewspapers();
    await seedNewArticleCategory();
    await seedUsers();
    await seedAsignRoles();
    await seedRandomAuthors(15);
    await seedArticles();
    await seedEmma();
    await seedArticleReviews();
    await seedLikes();
    await seedComments();
    await seedArticleViews();
    await seedE2eUsers();
    await seedSeedUser();

}

console.log("Getting ready...");
seed()
    .then(() => {
        console.log("✅ Done!");
        process.exit(0);
    })
    .catch((err) => {
        console.error("❌ Something went wrong...", err);
        process.exit(1);
    });