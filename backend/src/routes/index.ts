import { Router } from "express";
import authRoutes       from "./auth";
import productRoutes    from "./products";
import orderRoutes      from "./orders";
import reviewRoutes     from "./reviews";
import tenantRoutes     from "./tenants";
import adminRoutes      from "./admin";
import categoryRoutes   from "./categories";
import vendorRoutes     from "./vendor";
import tagRoutes        from "./tags";
import libraryRoutes    from "./library";
import checkoutRoutes   from "./checkout";
import uploadRoutes     from "./upload";

const router = Router();

router.use("/auth",       authRoutes);
router.use("/upload",     uploadRoutes);
router.use("/products",   productRoutes);
router.use("/orders",     orderRoutes);
router.use("/reviews",    reviewRoutes);
router.use("/tenants",    tenantRoutes);
router.use("/admin",      adminRoutes);
router.use("/categories", categoryRoutes);
router.use("/vendor",     vendorRoutes);
router.use("/tags",       tagRoutes);
router.use("/library",    libraryRoutes);
router.use("/checkout",   checkoutRoutes);

export default router;
