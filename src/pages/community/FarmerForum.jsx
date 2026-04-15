import React, { useState, useMemo } from 'react';
import { 
    Card, Typography, Button, Input, List, Tag, Avatar, Space, 
    Drawer, Modal, Form, Select, Divider, Empty, Tooltip
} from 'antd';
import { 
    PlusOutlined, MessageOutlined, EyeOutlined, UserOutlined, 
    SearchOutlined, LikeOutlined, FilterOutlined, PushpinOutlined,
    ShareAltOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import 'dayjs/locale/th';

dayjs.locale('th');

const { Title, Text, Paragraph } = Typography;
const { Search } = Input;
const { Option } = Select;

// ----- Mock Data -----
const CATEGORIES = [
    { value: 'โรคพืชและแมลง', color: 'red' },
    { value: 'ราคาตลาด', color: 'gold' },
    { value: 'เทคโนโลยี/นวัตกรรม', color: 'blue' },
    { value: 'ภัยพิบัติ', color: 'orange' },
    { value: 'ทั่วไป', color: 'green' }
];

const INITIAL_POSTS = [
    {
        id: 1,
        title: 'เตือนภัย! พบหนอนกระทู้ข้าวโพดลายจุดระบาดในพื้นที่บางเลน',
        author: 'เจ้าหน้าที่เกษตรอำเภอ',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Officer',
        category: 'โรคพืชและแมลง',
        createdAt: '2026-04-14T08:30:00',
        content: 'เรียนพี่น้องเกษตรกรผู้ปลูกข้าวโพดในพื้นที่อำเภอบางเลน ขณะนี้พบการระบาดของหนอนกระทู้หอมลายจุด ขอให้หมั่นสำรวจแปลง หากพบเกิน 20% ของพื้นที่ให้รีบแจ้งเจ้าหน้าที่ หรือใช้สารชีวภัณฑ์ในการควบคุมด่วนครับ',
        views: 245,
        likes: 42,
        isPinned: true,
        comments: [
            { id: 101, author: 'สมชาย นาดำ', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Somchai', content: 'ขอบคุณครับ จะรีบไปตรวจดูที่นาเลย', createdAt: '2026-04-14T09:15:00', likes: 5 },
            { id: 102, author: 'วิชัย เกษตรก้าวหน้า', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Wichai', content: 'หมู่ 4 พบแล้วประมาณ 3 ไร่ครับ กำลังฉีดพ่น', createdAt: '2026-04-14T10:20:00', likes: 2 }
        ]
    },
    {
        id: 2,
        title: 'ราคาส้มโอขาวน้ำผึ้งช่วงนี้รับซื้อกิโลละเท่าไหร่ครับ?',
        author: 'ป้าสมใจ สวนส้มโอ',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Somjai',
        category: 'ราคาตลาด',
        createdAt: '2026-04-15T07:10:00',
        content: 'ช่วงนี้ผลผลิตที่สวนกำลังจะออก อยากสอบถามเพื่อนๆ สมาชิกว่าล้งแถวสามพรานให้ราคากันอยู่ที่กิโลละเท่าไหร่ครับ?',
        views: 120,
        likes: 12,
        isPinned: false,
        comments: [
            { id: 201, author: 'ล้งเฮียชัย สามพราน', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=HeaChai', content: 'เบอร์สวยๆ ให้กิโลละ 45-50 บาทครับ ชวนแวะมาดูก่อนได้ครับ', createdAt: '2026-04-15T08:30:00', likes: 8 }
        ]
    },
    {
        id: 3,
        title: 'มีใครเคยใช้โดรนพ่นปุ๋ยบ้าง คุ้มค่าจ้างไหม?',
        author: 'บุญเลิศ พันธุ์ดี',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Boonlert',
        category: 'เทคโนโลยี/นวัตกรรม',
        createdAt: '2026-04-13T15:20:00',
        content: 'กำลังตัดสินใจว่าจะจ้างโดรนมาพ่นฮอร์โมนทางใบแปลงนา 15 ไร่ อยากทราบว่ามันละอองทั่วถึงดีไหมครับ เทียบกับจ้างคนพ่นแบบไหนประหยัดเวลากว่ากัน?',
        views: 312,
        likes: 28,
        isPinned: false,
        comments: [
            { id: 301, author: 'เอก โดรนเกษตร', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aek', content: 'ถ้า 15 ไร่โดรนบินประมาณ 30-40 นาทีเสร็จครับ ละอองละเอียดเกาะใบดี ประหยัดน้ำยาไปได้เยอะครับ', createdAt: '2026-04-13T16:05:00', likes: 15 },
            { id: 302, author: 'ตาชม สวนผสม', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Chom', content: 'คุ้มกว่าครับ ไม่ต้องย่ำข้าวเสียด้วย', createdAt: '2026-04-13T18:10:00', likes: 10 }
        ]
    }
];

export default function FarmerForum() {
    const [posts, setPosts] = useState(INITIAL_POSTS);
    const [searchText, setSearchText] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    
    // UI States
    const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
    const [selectedPost, setSelectedPost] = useState(null);
    const [isDrawerVisible, setIsDrawerVisible] = useState(false);
    
    const [form] = Form.useForm();
    const [commentText, setCommentText] = useState('');

    // Filter Logic
    const filteredPosts = useMemo(() => {
        return posts.filter(post => {
            const matchSearch = post.title.toLowerCase().includes(searchText.toLowerCase()) || 
                                post.content.toLowerCase().includes(searchText.toLowerCase());
            const matchCategory = selectedCategory === 'all' || post.category === selectedCategory;
            return matchSearch && matchCategory;
        }).sort((a, b) => {
            if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
            return new Date(b.createdAt) - new Date(a.createdAt);
        });
    }, [posts, searchText, selectedCategory]);

    const handleCreatePost = (values) => {
        const newPost = {
            id: Date.now(),
            title: values.title,
            content: values.content,
            category: values.category,
            author: 'ผู้ใช้งานปัจจุบัน', // Mock current user
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=CurrentUser',
            createdAt: new Date().toISOString(),
            views: 0,
            likes: 0,
            isPinned: false,
            comments: []
        };
        setPosts([newPost, ...posts]);
        setIsCreateModalVisible(false);
        form.resetFields();
    };

    const handleAddComment = () => {
        if (!commentText.trim()) return;
        
        const updatedPosts = posts.map(post => {
            if (post.id === selectedPost.id) {
                const newComment = {
                    id: Date.now(),
                    author: 'ผู้ใช้งานปัจจุบัน',
                    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=CurrentUser',
                    content: commentText,
                    createdAt: new Date().toISOString(),
                    likes: 0
                };
                const updatedPost = { ...post, comments: [...post.comments, newComment] };
                setSelectedPost(updatedPost); // Update view
                return updatedPost;
            }
            return post;
        });
        
        setPosts(updatedPosts);
        setCommentText('');
    };

    const openPost = (post) => {
        // Increment view count logically
        const updatedPosts = posts.map(p => 
            p.id === post.id ? { ...p, views: p.views + 1 } : p
        );
        setPosts(updatedPosts);
        
        const updatedPost = updatedPosts.find(p => p.id === post.id);
        setSelectedPost(updatedPost);
        setIsDrawerVisible(true);
    };

    const getCategoryColor = (categoryName) => {
        const cat = CATEGORIES.find(c => c.value === categoryName);
        return cat ? cat.color : 'default';
    };

    const formatDate = (dateString) => {
        return dayjs(dateString).format('DD MMM YYYY HH:mm');
    };

    return (
        <div style={{ padding: '0 0 24px 0' }}>
            {/* Header Section */}
            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                <div>
                    <Title level={2} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <MessageOutlined style={{ color: '#1a7f37' }} />กระดานข่าวอัจฉริยะ (Farmer Forum)
                    </Title>
                    <Text type="secondary">พื้นที่แลกเปลี่ยนเรียนรู้ ถามตอบปัญหา และแชร์ประสบการณ์เพื่อเกษตรกรนครปฐม</Text>
                </div>
                <Button 
                    type="primary" 
                    icon={<PlusOutlined />} 
                    size="large"
                    onClick={() => setIsCreateModalVisible(true)}
                    style={{ backgroundColor: '#1a7f37' }}
                >
                    ตั้งกระทู้ใหม่
                </Button>
            </div>

            {/* Main Content Area */}
            <Card variant="borderless" style={{ background: '#ffffff', borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                {/* Search & Filter Bar */}
                <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
                    <Search
                        placeholder="ค้นหาหัวข้อกระทู้, เนื้อหา..."
                        allowClear
                        enterButton={<Button icon={<SearchOutlined />} style={{ backgroundColor: '#1a7f37', color: '#fff' }}>ค้นหา</Button>}
                        size="large"
                        onChange={(e) => setSearchText(e.target.value)}
                        style={{ maxWidth: 400, flex: 1 }}
                    />
                    <Select 
                        size="large"
                        value={selectedCategory} 
                        onChange={setSelectedCategory}
                        style={{ width: 220 }}
                        suffixIcon={<FilterOutlined />}
                    >
                        <Option value="all">ทุกหมวดหมู่</Option>
                        {CATEGORIES.map(cat => (
                            <Option key={cat.value} value={cat.value}>{cat.value}</Option>
                        ))}
                    </Select>
                </div>

                {/* Forum List */}
                <List
                    itemLayout="vertical"
                    size="large"
                    pagination={{
                        onChange: (page) => { console.log(page); },
                        pageSize: 5,
                    }}
                    dataSource={filteredPosts}
                    locale={{ emptyText: <Empty description="ไม่พบกระทู้ที่ค้นหา" /> }}
                    renderItem={(item) => (
                        <List.Item
                            key={item.id}
                            style={{ 
                                cursor: 'pointer', 
                                borderBottom: '1px solid #f0f0f0',
                                transition: 'background-color 0.3s',
                                padding: '16px',
                                borderRadius: '8px'
                            }}
                            className="forum-list-item"
                            onClick={() => openPost(item)}
                            actions={[
                                <Tooltip title="ถูกใจ" key="list-like">
                                    <Space><LikeOutlined /> {item.likes}</Space>
                                </Tooltip>,
                                <Tooltip title="ความคิดเห็น" key="list-comment">
                                    <Space><MessageOutlined /> {item.comments.length}</Space>
                                </Tooltip>,
                                <Tooltip title="ยอดเข้าชม" key="list-view">
                                    <Space><EyeOutlined /> {item.views}</Space>
                                </Tooltip>
                            ]}
                        >
                            <List.Item.Meta
                                avatar={<Avatar src={item.avatar} size="large" icon={<UserOutlined />} />}
                                title={
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                        {item.isPinned && <Tooltip title="กระทู้ปักหมุด"><Tag color="red" icon={<PushpinOutlined />}>ประกาศ</Tag></Tooltip>}
                                        <Tag color={getCategoryColor(item.category)}>{item.category}</Tag>
                                        <span style={{ fontSize: '1.2rem', fontWeight: 600 }}>{item.title}</span>
                                    </div>
                                }
                                description={
                                    <Space style={{ color: '#8c8c8c', fontSize: '0.9rem' }}>
                                        <span>เขียนโดย: <b style={{ color: '#595959' }}>{item.author}</b></span>
                                        <span>•</span>
                                        <span>{formatDate(item.createdAt)}</span>
                                    </Space>
                                }
                            />
                            <Paragraph ellipsis={{ rows: 2 }} style={{ marginTop: 8, color: '#595959' }}>
                                {item.content}
                            </Paragraph>
                        </List.Item>
                    )}
                />
            </Card>

            {/* Create Post Modal */}
            <Modal
                title={<h3><PlusOutlined /> ตั้งกระทู้ใหม่</h3>}
                open={isCreateModalVisible}
                onCancel={() => setIsCreateModalVisible(false)}
                footer={null}
                width={700}
                styles={{ content: { backgroundColor: '#ffffff' } }}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleCreatePost}
                    style={{ marginTop: 24 }}
                >
                    <Form.Item
                        name="title"
                        label={<span style={{ fontWeight: 500 }}>หัวข้อกระทู้</span>}
                        rules={[{ required: true, message: 'กรุณาระบุหัวข้อกระทู้' }]}
                    >
                        <Input size="large" placeholder="ระบุคำถาม หรือหัวข้อที่ต้องการเผยแพร่" />
                    </Form.Item>
                    
                    <Form.Item
                        name="category"
                        label={<span style={{ fontWeight: 500 }}>หมวดหมู่</span>}
                        rules={[{ required: true, message: 'กรุณาเลือกหมวดหมู่' }]}
                    >
                        <Select size="large" placeholder="เลือกหมวดหมู่ที่เกี่ยวข้อง">
                            {CATEGORIES.map(cat => (
                                <Option key={cat.value} value={cat.value}>{cat.value}</Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="content"
                        label={<span style={{ fontWeight: 500 }}>เนื้อหา / รายละเอียด</span>}
                        rules={[{ required: true, message: 'กรุณาระบุเนื้อหา' }]}
                    >
                        <Input.TextArea rows={6} placeholder="พิมพ์อธิบายรายละเอียดของปัญหา แนวทาง หรือแบ่งปันความรู้..." />
                    </Form.Item>

                    {/* Image Upload Mock */}
                    <Form.Item label={<span style={{ fontWeight: 500 }}>แนบรูปภาพ (ถ้ามี)</span>}>
                         <Button icon={<PlusOutlined />}>เลือกรูปภาพ</Button>
                         <Text type="secondary" style={{ marginLeft: 8 }}>รองรับ JPG, PNG สูงสุด 5MB</Text>
                    </Form.Item>

                    <Form.Item style={{ textAlign: 'right', marginTop: 32, marginBottom: 0 }}>
                        <Space>
                            <Button onClick={() => setIsCreateModalVisible(false)}>ยกเลิก</Button>
                            <Button type="primary" htmlType="submit" style={{ backgroundColor: '#1a7f37' }}>
                                โพสต์กระทู้
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>

            {/* View Post Drawer */}
            <Drawer
                width={800}
                placement="right"
                onClose={() => setIsDrawerVisible(false)}
                open={isDrawerVisible}
                styles={{ 
                    body: { padding: 0, backgroundColor: '#f0f2f5' } 
                }}
            >
                {selectedPost && (
                    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                        {/* Drawer Header Area inside body to allow custom styling */}
                        <div style={{ padding: '24px', backgroundColor: '#ffffff', borderBottom: '1px solid #f0f0f0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <Space style={{ marginBottom: 16 }}>
                                        {selectedPost.isPinned && <Tag color="red" icon={<PushpinOutlined />}>ประกาศ</Tag>}
                                        <Tag color={getCategoryColor(selectedPost.category)}>{selectedPost.category}</Tag>
                                    </Space>
                                    <Title level={3} style={{ marginTop: 0 }}>
                                        {selectedPost.title}
                                    </Title>
                                </div>
                                <Button icon={<ShareAltOutlined />} type="text" />
                            </div>
                            
                            <Space size="large" style={{ marginTop: 16 }}>
                                <Space>
                                    <Avatar src={selectedPost.avatar} icon={<UserOutlined />} />
                                    <div>
                                        <div style={{ fontWeight: 600 }}>{selectedPost.author}</div>
                                        <div style={{ color: '#8c8c8c', fontSize: 12 }}>{formatDate(selectedPost.createdAt)}</div>
                                    </div>
                                </Space>
                                <Divider type="vertical" />
                                <Space style={{ color: '#8c8c8c' }}>
                                    <EyeOutlined /> {selectedPost.views}
                                </Space>
                            </Space>
                        </div>

                        {/* Post Content */}
                        <div style={{ padding: '24px', flex: '0 0 auto', backgroundColor: '#ffffff', marginBottom: '8px' }}>
                            <Paragraph style={{ fontSize: '1.1rem', lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>
                                {selectedPost.content}
                            </Paragraph>
                            <div style={{ marginTop: 24 }}>
                                <Button icon={<LikeOutlined />} size="large">
                                    ถูกใจ ({selectedPost.likes})
                                </Button>
                            </div>
                        </div>

                        {/* Comments Area */}
                        <div style={{ padding: '24px', flex: 1, overflowY: 'auto', backgroundColor: '#ffffff' }}>
                            <Title level={4}>ความคิดเห็น ({selectedPost.comments.length})</Title>
                            
                            {selectedPost.comments.length > 0 ? (
                                <List
                                    dataSource={selectedPost.comments}
                                    renderItem={(comment) => (
                                        <List.Item style={{ borderBottom: '1px solid #f0f0f0' }}>
                                            <List.Item.Meta
                                                avatar={<Avatar src={comment.avatar} icon={<UserOutlined />} />}
                                                title={
                                                    <span style={{ fontWeight: 600 }}>
                                                        {comment.author} <span style={{ fontWeight: 'normal', color: '#8c8c8c', fontSize: 12, marginLeft: 8 }}>• {formatDate(comment.createdAt)}</span>
                                                    </span>
                                                }
                                                description={
                                                    <div style={{ marginTop: 8, color: '#595959' }}>
                                                        {comment.content}
                                                        <div style={{ marginTop: 8 }}>
                                                            <Space style={{ color: '#8c8c8c', cursor: 'pointer' }}>
                                                                <LikeOutlined /> {comment.likes}
                                                            </Space>
                                                        </div>
                                                    </div>
                                                }
                                            />
                                        </List.Item>
                                    )}
                                />
                            ) : (
                                <Empty description="ยังไม่มีความคิดเห็น เริ่มแสดงความคิดเห็นเป็นคนแรก!" />
                            )}
                        </div>

                        {/* Comment Input Sticky Bottom */}
                        <div style={{ padding: '16px 24px', backgroundColor: '#ffffff', borderTop: '1px solid #f0f0f0' }}>
                            <Space.Compact style={{ width: '100%' }}>
                                <Input 
                                    size="large" 
                                    placeholder="เขียนความคิดเห็นของคุณ..." 
                                    value={commentText}
                                    onChange={(e) => setCommentText(e.target.value)}
                                    onPressEnter={handleAddComment}
                                />
                                <Button type="primary" size="large" onClick={handleAddComment} style={{ backgroundColor: '#1a7f37' }}>
                                    ส่ง
                                </Button>
                            </Space.Compact>
                        </div>
                    </div>
                )}
            </Drawer>
            <style jsx global>{`
                .forum-list-item:hover {
                    background-color: #f5f5f5 !important;
                }
            `}</style>
        </div>
    );
}
