/* [수정 일시: 2026-05-19 01:43:00 KST] CORS 우회용 공용 응답 헤더 탑재 및 파일 바이너리 세팅 완료 */
require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const path = require('path');
const multer = require('multer');
const ExcelJS = require('exceljs');

const app = express();
app.use(express.json());

// 모든 도메인에서의 이미지 자원 요청(CORS)을 허용하는 전역 미들웨어 설정
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

app.use(express.static(path.join(__dirname))); 

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const r2Client = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});

const upload = multer({ storage: multer.memoryStorage() });

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/api/posts', async (req, res) => {
    try {
        const { data, error } = await supabase.from('posts').select('*').order('id', { ascending: false });
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/posts', upload.single('image'), async (req, res) => {
    try {
        const { title, content } = req.body;
        let image_url = '';

        if (req.file) {
            const fileName = `${Date.now()}_${req.file.originalname}`;
            await r2Client.send(new PutObjectCommand({
                Bucket: process.env.R2_BUCKET_NAME,
                Key: fileName,
                Body: req.file.buffer,
                ContentType: req.file.mimetype // 브라우저가 정적 이미지 파일로 즉시 식별하도록 타입 지정
            }));
            
            const targetAccountHash = "d2bd09165e854aae8e430eed2401d673";
            // [정정] pub- 접두사를 붙여 브라우저 정적 서빙 주소 규격 완벽 일치 보장
            image_url = `https://pub-${targetAccountHash}.r2.dev/${fileName}`;
        }

        const { data, error } = await supabase.from('posts').insert([{ title, content, image_url }]).select();
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/posts/:id', async (req, res) => {
    try {
        const { title, content } = req.body;
        const { data, error } = await supabase.from('posts').update({ title, content }).eq('id', req.params.id).select();
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/posts/:id', async (req, res) => {
    try {
        const { error } = await supabase.from('posts').delete().eq('id', req.params.id);
        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/posts/excel', async (req, res) => {
    try {
        const { data: posts, error } = await supabase.from('posts').select('*').order('id', { ascending: false });
        if (error) throw error;

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('ERP_Posts');

        worksheet.columns = [
            { header: '순번', key: 'id', width: 10 },
            { header: '작성일', key: 'created_at', width: 25 },
            { header: '제목', key: 'title', width: 30 },
            { header: '내용', key: 'content', width: 50 },
            { header: '이미지 URL', key: 'image_url', width: 40 }
        ];

        posts.forEach(post => worksheet.addRow(post));

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=ERP_Report.xlsx');
        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        res.status(500).send(err.message);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('🚀 서버 구동 중'));
