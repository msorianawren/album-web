# UX Diagnosis

1. **What is visually weak?**
   - The About page falls back to some visual artifacts but lacks a truly premium "demo" look if data is totally empty (though it does have a `_is_demo` state, it can be tightened).
   - "No Image" empty states might exist in edge cases, and the contact page relies heavily on form inputs without reassuring context.
   - Album cards lack clear badging that matches the quiet luxury aesthetic (current badges are functional but maybe not "editorial" enough).

2. **What is confusing to a first-time visitor?**
   - The private access flow is confusing. "Request Admin Permission" sounds very technical and intimidating.
   - Knowing which albums are public vs private isn't immediately obvious without hovering/looking closely.
   - The contact page might not make it clear what kind of inquiries are accepted.

3. **What is confusing to a returning visitor?**
   - There's no clear indication of where they left off (which albums they viewed or have partially viewed).
   - The header/avatar menu might feel scattered with too many un-grouped options.

4. **What feels unfinished?**
   - System feedback (actions like "Like" or "Request access" might happen silently without a clear toast or message).
   - Missing states on the About page.

5. **What feels too technical?**
   - "Request Admin Permission", "Error", "Failed", "Google accounts only". These break the editorial immersion.

6. **What feels slow or heavy?**
   - Unoptimized images in the album grid (loading full-sized images instead of thumbnails).
   - Too many GSAP animations running simultaneously or offscreen.

7. **What is risky to change?**
   - Security guards around private albums, ZIP downloads, and contact message spam protection.
   - The `AlbumAuthLayer` and database queries that ensure private media is not leaked.

8. **What should be preserved exactly?**
   - All private album logic.
   - The existing features (likes, comments, downloads, Studio, i18n).
   - The overall dark/nature aesthetic without making it heavier.

9. **What can be improved safely now?**
   - Microcopy across public pages.
   - LocalStorage-based album memory (viewed states).
   - Reorganizing the Avatar menu into logical groups.
   - Adding clear, subtle system feedback (toasts).
   - Adding `sizes` and `priority` attributes to `next/image` to improve LCP.

10. **How to verify each improvement?**
    - Ensure `npm run dev` builds successfully.
    - Check the public pages as a guest, check as a logged-in user, check private album access.
    - Ensure no private media is visible in the network tab when logged out.
