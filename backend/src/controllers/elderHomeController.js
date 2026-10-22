const prisma = require('../../db');
const { saveBase64Image } = require('../utils/fileUpload');

// Public: Get Elder Home Full Profile (for patients / public view)
exports.getElderHomeProfile = async (req, res) => {
    try {
        const { id } = req.params;

        const elderHome = await prisma.professionalProfile.findFirst({
            where: {
                OR: [
                    { id: id },
                    { userId: id }
                ],
                user: { role: 'ELDER_HOME' }
            },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        phone: true,
                        fullName: true,
                        role: true,
                        verificationStatus: true,
                        createdAt: true
                    }
                },
                elderHomePosts: {
                    orderBy: { createdAt: 'desc' }
                },
                elderHomeServices: {
                    orderBy: { createdAt: 'asc' }
                },
                reviews: {
                    include: {
                        patient: {
                            include: {
                                user: { select: { fullName: true } }
                            }
                        }
                    },
                    orderBy: { createdAt: 'desc' }
                }
            }
        });

        if (!elderHome) {
            return res.status(404).json({ message: 'Elder home not found' });
        }

        return res.status(200).json(elderHome);
    } catch (error) {
        console.error('Error fetching elder home profile:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// Public: Get Posts for an Elder Home
exports.getElderHomePosts = async (req, res) => {
    try {
        const { id } = req.params;
        const posts = await prisma.elderHomePost.findMany({
            where: {
                OR: [
                    { elderHomeId: id },
                    { elderHome: { userId: id } }
                ]
            },
            orderBy: { createdAt: 'desc' }
        });
        return res.status(200).json(posts);
    } catch (error) {
        console.error('Error fetching elder home posts:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// Public: Get Services for an Elder Home
exports.getElderHomeServices = async (req, res) => {
    try {
        const { id } = req.params;
        const services = await prisma.elderHomeService.findMany({
            where: {
                OR: [
                    { elderHomeId: id },
                    { elderHome: { userId: id } }
                ]
            },
            orderBy: { createdAt: 'asc' }
        });
        return res.status(200).json(services);
    } catch (error) {
        console.error('Error fetching elder home services:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// Owner: Get My Elder Home Profile
exports.getMyProfile = async (req, res) => {
    try {
        const profile = await prisma.professionalProfile.findUnique({
            where: { userId: req.user.id },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        phone: true,
                        fullName: true,
                        role: true,
                        verificationStatus: true
                    }
                },
                elderHomePosts: {
                    orderBy: { createdAt: 'desc' }
                },
                elderHomeServices: {
                    orderBy: { createdAt: 'asc' }
                }
            }
        });

        if (!profile) {
            return res.status(404).json({ message: 'Profile not found' });
        }

        return res.status(200).json(profile);
    } catch (error) {
        console.error('Error fetching my elder home profile:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// Owner: Update My Elder Home Profile & Details
exports.updateMyProfile = async (req, res) => {
    try {
        const {
            fullName,
            specialization, // Owner Name
            address,
            contactPhone,
            locationLat,
            locationLng,
            policies,
            facilities,
            coverImage,
            profileImage,
            socialFacebook,
            socialInstagram,
            socialWhatsapp,
            socialWebsite
        } = req.body;

        const existing = await prisma.professionalProfile.findUnique({
            where: { userId: req.user.id }
        });

        if (!existing) {
            return res.status(404).json({ message: 'Profile not found' });
        }

        let savedCover = existing.coverImage;
        if (coverImage) {
            if (coverImage.startsWith('data:image')) {
                savedCover = saveBase64Image(coverImage, 'elder-homes');
            } else {
                savedCover = coverImage;
            }
        }

        let savedProfile = existing.profileImage;
        if (profileImage) {
            if (profileImage.startsWith('data:image')) {
                savedProfile = saveBase64Image(profileImage, 'elder-homes');
            } else {
                savedProfile = profileImage;
            }
        }

        // Protected verified fields: fullName (Home Name), specialization (Owner Name), address cannot be changed by the owner.
        // They can only be updated by the Admin.
        const updateData = {
            ...(contactPhone !== undefined && { contactPhone }),
            ...(policies !== undefined && { policies }),
            ...(facilities !== undefined && { facilities }),
            ...(socialFacebook !== undefined && { socialFacebook }),
            ...(socialInstagram !== undefined && { socialInstagram }),
            ...(socialWhatsapp !== undefined && { socialWhatsapp }),
            ...(socialWebsite !== undefined && { socialWebsite }),
            ...(savedCover !== undefined && { coverImage: savedCover }),
            ...(savedProfile !== undefined && { profileImage: savedProfile })
        };

        if (locationLat !== undefined && locationLat !== null) {
            updateData.locationLat = parseFloat(locationLat);
        }
        if (locationLng !== undefined && locationLng !== null) {
            updateData.locationLng = parseFloat(locationLng);
        }

        const updatedProfile = await prisma.professionalProfile.update({
            where: { userId: req.user.id },
            data: updateData,
            include: {
                user: true,
                elderHomePosts: { orderBy: { createdAt: 'desc' } },
                elderHomeServices: { orderBy: { createdAt: 'asc' } }
            }
        });

        return res.status(200).json({
            message: 'Profile updated successfully',
            profile: updatedProfile
        });
    } catch (error) {
        console.error('Error updating elder home profile:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// Owner: Create a Post / Ad / Update
exports.createPost = async (req, res) => {
    try {
        const { title, content, category = 'UPDATE', image } = req.body;

        if (!content || !content.trim()) {
            return res.status(400).json({ message: 'Post content is required' });
        }

        const prof = await prisma.professionalProfile.findUnique({
            where: { userId: req.user.id }
        });

        if (!prof) {
            return res.status(404).json({ message: 'Elder home profile not found' });
        }

        let imageUrl = null;
        if (image) {
            if (image.startsWith('data:image')) {
                imageUrl = saveBase64Image(image, 'elder-home-posts');
            } else {
                imageUrl = image;
            }
        }

        const post = await prisma.elderHomePost.create({
            data: {
                elderHomeId: prof.id,
                title: title?.trim() || null,
                content: content.trim(),
                category: category || 'UPDATE',
                imageUrl: imageUrl
            }
        });

        return res.status(201).json({
            message: 'Post published successfully',
            post
        });
    } catch (error) {
        console.error('Error creating elder home post:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// Owner: Delete a Post
exports.deletePost = async (req, res) => {
    try {
        const { postId } = req.params;

        const prof = await prisma.professionalProfile.findUnique({
            where: { userId: req.user.id }
        });

        if (!prof) {
            return res.status(404).json({ message: 'Profile not found' });
        }

        const post = await prisma.elderHomePost.findFirst({
            where: { id: postId, elderHomeId: prof.id }
        });

        if (!post) {
            return res.status(404).json({ message: 'Post not found or unauthorized' });
        }

        await prisma.elderHomePost.delete({
            where: { id: postId }
        });

        return res.status(200).json({ message: 'Post deleted successfully' });
    } catch (error) {
        console.error('Error deleting elder home post:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// Owner: Add a Service & Price
exports.createService = async (req, res) => {
    try {
        const { name, description, price, priceUnit = 'per month' } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'Service name is required' });
        }

        const prof = await prisma.professionalProfile.findUnique({
            where: { userId: req.user.id }
        });

        if (!prof) {
            return res.status(404).json({ message: 'Elder home profile not found' });
        }

        const service = await prisma.elderHomeService.create({
            data: {
                elderHomeId: prof.id,
                name: name.trim(),
                description: description?.trim() || null,
                price: parseFloat(price) || 0,
                priceUnit: priceUnit || 'per month'
            }
        });

        return res.status(201).json({
            message: 'Service added successfully',
            service
        });
    } catch (error) {
        console.error('Error adding elder home service:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// Owner: Update a Service
exports.updateService = async (req, res) => {
    try {
        const { serviceId } = req.params;
        const { name, description, price, priceUnit } = req.body;

        const prof = await prisma.professionalProfile.findUnique({
            where: { userId: req.user.id }
        });

        if (!prof) {
            return res.status(404).json({ message: 'Profile not found' });
        }

        const service = await prisma.elderHomeService.findFirst({
            where: { id: serviceId, elderHomeId: prof.id }
        });

        if (!service) {
            return res.status(404).json({ message: 'Service not found or unauthorized' });
        }

        const updated = await prisma.elderHomeService.update({
            where: { id: serviceId },
            data: {
                ...(name && { name: name.trim() }),
                ...(description !== undefined && { description: description?.trim() || null }),
                ...(price !== undefined && { price: parseFloat(price) || 0 }),
                ...(priceUnit !== undefined && { priceUnit })
            }
        });

        return res.status(200).json({
            message: 'Service updated successfully',
            service: updated
        });
    } catch (error) {
        console.error('Error updating elder home service:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// Owner: Delete a Service
exports.deleteService = async (req, res) => {
    try {
        const { serviceId } = req.params;

        const prof = await prisma.professionalProfile.findUnique({
            where: { userId: req.user.id }
        });

        if (!prof) {
            return res.status(404).json({ message: 'Profile not found' });
        }

        const service = await prisma.elderHomeService.findFirst({
            where: { id: serviceId, elderHomeId: prof.id }
        });

        if (!service) {
            return res.status(404).json({ message: 'Service not found or unauthorized' });
        }

        await prisma.elderHomeService.delete({
            where: { id: serviceId }
        });

        return res.status(200).json({ message: 'Service deleted successfully' });
    } catch (error) {
        console.error('Error deleting elder home service:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
